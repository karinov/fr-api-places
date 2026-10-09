import { FrenchCity, PlaceItem, RetailChain } from '../types';
import { FRENCH_CITIES } from '../data/frenchCities';
import { RETAIL_CHAINS } from '../data/retailChains';

export const UNKNOWN_LABEL = '—';

export const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Case + accent + punctuation insensitive key.
 * "Île-de-France" / "ile de france" / "Île de France" -> "ile_de_france"
 * "Provence-Alpes-Côte d’Azur" (typographic apostrophe from Google) === "provence_alpes_cote_d_azur"
 */
export const normalizeKey = (value: unknown): string =>
  stripAccents(String(value ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const resolveCoverage = (value: unknown): FrenchCity | null => {
  const key = normalizeKey(value);
  if (!key) return null;
  return (
    FRENCH_CITIES.find((c) => c.id === key) ??
    FRENCH_CITIES.find((c) => normalizeKey(c.name) === key) ??
    null
  );
};

export const isValidCoverageId = (value: unknown): boolean =>
  Boolean(normalizeKey(value)) && FRENCH_CITIES.some((c) => c.id === normalizeKey(value));

/**
 * Exact id, then exact normalized name, then containment.
 * Containment is safe here because chain names are far less ambiguous than
 * region names, and it is what maps "H&M" -> "hm" / "B&M" -> "bm" / "E.Leclerc" -> "e_leclerc".
 */
export const resolveChain = (value: unknown): RetailChain | null => {
  const key = normalizeKey(value);
  if (!key) return null;
  return (
    RETAIL_CHAINS.find((c) => c.id === key) ??
    RETAIL_CHAINS.find((c) => normalizeKey(c.name) === key) ??
    RETAIL_CHAINS.find((c) => key.includes(normalizeKey(c.name))) ??
    null
  );
};

const readComponent = (raw: unknown, types: string[]): string | undefined => {
  const components = (raw as any)?.addressComponents;
  if (!Array.isArray(components)) return undefined;
  for (const type of types) {
    const hit = components.find(
      (c: any) => Array.isArray(c?.types) && c.types.includes(type)
    );
    const longText = hit?.longText ?? hit?.shortText;
    if (typeof longText === 'string' && longText.trim()) return longText;
  }
  return undefined;
};

/** Only region/territory entries qualify as a region; cities and national are rejected. */
const asRegionEntry = (city: FrenchCity | null): FrenchCity | null => {
  if (!city) return null;
  return city.level === 'region' || city.level === 'territory' ? city : null;
};

/** administrative_area_level_1 maps 1:1 onto our 13 regions + 5 overseas territories. */
export const resolveRegionFromRaw = (raw: unknown): FrenchCity | null => {
  const level1 = readComponent(raw, ['administrative_area_level_1']);
  const direct = asRegionEntry(resolveCoverage(level1));
  if (direct) return direct;
  // Overseas fallback: the territory name may sit on a lower level.
  for (const type of [
    'administrative_area_level_2',
    'locality',
    'postal_town',
    'sublocality_level_1',
  ]) {
    const hit = asRegionEntry(resolveCoverage(readComponent(raw, [type])));
    if (hit) return hit;
  }
  return null;
};

export const resolveLocalityFromRaw = (raw: unknown): string | null => {
  for (const type of [
    'locality',
    'postal_town',
    'sublocality_level_1',
    'sublocality',
    'administrative_area_level_2',
    'administrative_area_level_3',
  ]) {
    const value = readComponent(raw, [type]);
    if (value) return value;
  }
  return null;
};

/** Locality guessed from a postal address, restricted to entries we actually know as cities. */
const matchCityFromAddress = (address: string): FrenchCity | null => {
  const haystack = stripAccents(address).toLowerCase();
  if (!haystack) return null;
  return (
    FRENCH_CITIES.find(
      (c) => c.level === 'city' && haystack.includes(stripAccents(c.name).toLowerCase())
    ) ?? null
  );
};

/**
 * Region for a coverage tag: a city tag inherits its parent region,
 * while a region/territory/national tag is its own region.
 */
export const regionNameForCoverage = (coverage: FrenchCity | null): string => {
  if (!coverage) return '';
  if (coverage.level === 'city') return coverage.region;
  if (coverage.level === 'national') return '';
  return coverage.name;
};

export const regionIdForCoverage = (coverage: FrenchCity | null): string => {
  if (!coverage) return '';
  if (coverage.level === 'city') return normalizeKey(coverage.region);
  if (coverage.level === 'national') return 'france';
  return coverage.id;
};

const coverageFromPlace = (place: PlaceItem): FrenchCity | null => {
  if (place.cityId && isValidCoverageId(place.cityId)) {
    const byId = resolveCoverage(place.cityId);
    if (byId) return byId;
  }
  return resolveCoverage(place.cityName);
};

/**
 * Fill regionId / regionName / localityName without any network call.
 * Priority: Google addressComponents -> coverage tag -> address substring match.
 * Idempotent, so it is safe to run on every load/import/extraction pass.
 */
export const enrichPlace = (place: PlaceItem): PlaceItem => {
  if (!place) return place;

  const raw = place.rawData ?? place;
  const coverage = coverageFromPlace(place);
  const regionFromRaw = resolveRegionFromRaw(raw);

  const regionId = regionFromRaw?.id || place.regionId || regionIdForCoverage(coverage);
  const regionName = regionNameForCoverage(regionFromRaw) || place.regionName || regionNameForCoverage(coverage);

  let localityName = place.localityName || resolveLocalityFromRaw(raw) || undefined;
  if (!localityName && coverage?.level === 'city') localityName = coverage.name;
  if (!localityName) localityName = matchCityFromAddress(place.formattedAddress || '')?.name;

  return {
    ...place,
    regionId: regionId || undefined,
    regionName: regionName || UNKNOWN_LABEL,
    localityName: localityName || undefined,
  };
};

export const getRegionName = (place: PlaceItem): string =>
  place.regionName || regionNameForCoverage(coverageFromPlace(place)) || UNKNOWN_LABEL;

export const getLocalityName = (place: PlaceItem): string =>
  place.localityName ||
  (coverageFromPlace(place)?.level === 'city' ? place.cityName : '') ||
  UNKNOWN_LABEL;

/**
 * Export-safe labels. The UNKNOWN_LABEL sentinel must never be written to a file,
 * otherwise it is read back on import as a real value and blocks re-resolution.
 */
export const isUnknownLabel = (value: unknown): boolean => {
  const s = String(value ?? '').trim();
  return s === '' || s === UNKNOWN_LABEL || s === '--' || s === '-';
};

export const regionLabel = (place: PlaceItem): string | undefined =>
  isUnknownLabel(getRegionName(place)) ? undefined : getRegionName(place);

export const localityLabel = (place: PlaceItem): string | undefined =>
  isUnknownLabel(getLocalityName(place)) ? undefined : getLocalityName(place);
