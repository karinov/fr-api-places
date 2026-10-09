import { PlaceItem } from '../types';
import { RETAIL_CHAINS } from '../data/retailChains';
import { FRENCH_CITIES } from '../data/frenchCities';
import {
  enrichPlace,
  isUnknownLabel,
  localityLabel,
  regionLabel,
  isValidCoverageId,
  resolveChain,
  resolveCoverage,
} from './geo';

export type DatasetFormat = 'RAW_FULL' | 'CLEAN_GEOJSON' | 'CLEAN_ARRAY';

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

/** Reads an optional label, treating sentinels ("—", "--", "") as absent. */
const asOptionalLabel = (value: unknown): string | undefined => {
  const s = asString(value).trim();
  return isUnknownLabel(s) ? undefined : s;
};

/* ------------------------------------------------------------------ *
 * Export shapes
 * ------------------------------------------------------------------ */

const buildRawFull = (places: PlaceItem[]) =>
  places.map((p) => ({
    id: p.id,
    cityId: p.cityId,
    city: p.cityName,
    regionId: p.regionId,
    region: regionLabel(p),
    locality: localityLabel(p),
    chainId: p.chainId,
    chain: p.chainName,
    rawData: p.rawData || p,
  }));

const buildCleanArray = (places: PlaceItem[]) =>
  places.map((p) => ({
    id: p.id,
    chainId: p.chainId,
    chain: p.chainName,
    cityId: p.cityId,
    city: p.cityName,
    regionId: p.regionId,
    region: regionLabel(p),
    locality: localityLabel(p),
    displayName: p.displayName,
    address: p.formattedAddress,
    latitude: p.location.latitude,
    longitude: p.location.longitude,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    websiteUri: p.websiteUri,
    phoneNumber: p.nationalPhoneNumber,
    googleMapsUri: p.googleMapsUri,
  }));

const buildCleanGeoJson = (places: PlaceItem[]) => ({
  type: 'FeatureCollection',
  features: places.map((p) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [p.location.longitude, p.location.latitude],
    },
    properties: {
      id: p.id,
      chainId: p.chainId,
      chain: p.chainName,
      cityId: p.cityId,
      city: p.cityName,
      regionId: p.regionId,
      region: regionLabel(p),
      locality: localityLabel(p),
      name: p.displayName,
      address: p.formattedAddress,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      googleMapsUri: p.googleMapsUri,
    },
  })),
});

export const buildDataset = (places: PlaceItem[], format: DatasetFormat): unknown => {
  if (format === 'CLEAN_ARRAY') return buildCleanArray(places);
  if (format === 'CLEAN_GEOJSON') return buildCleanGeoJson(places);
  return buildRawFull(places);
};

/* ------------------------------------------------------------------ *
 * Import
 * ------------------------------------------------------------------ */

const matchCityFromAddress = (
  address: string,
  displayName: string
): { cityId: string; cityName: string } => {
  const haystacks = [address, displayName].map((s) => s.toLowerCase());
  const matched = FRENCH_CITIES.find(
    (c) => c.level === 'city' && haystacks.some((h) => h.includes(c.name.toLowerCase()))
  );
  return matched
    ? { cityId: matched.id, cityName: matched.name }
    : { cityId: 'france', cityName: 'France' };
};

/**
 * Coverage resolution order:
 *   1. an explicit, valid cityId
 *   2. cityName / city resolved against FRENCH_CITIES - this is what rescues legacy
 *      CLEAN_ARRAY + GeoJSON exports, where only the display name was ever written
 *   3. region as the coverage tag
 *   4. address substring match, restricted to entries we actually know as cities
 *   5. national fallback
 */
const resolveCoverageTag = (
  item: any,
  address: string,
  displayName: string
): { cityId: string; cityName: string } => {
  if (item.cityId && isValidCoverageId(item.cityId)) {
    const byId = resolveCoverage(item.cityId);
    if (byId) return { cityId: byId.id, cityName: byId.name };
  }
  const byName = resolveCoverage(item.cityName) ?? resolveCoverage(item.city);
  if (byName) return { cityId: byName.id, cityName: byName.name };
  const byRegion = resolveCoverage(item.region);
  if (byRegion) return { cityId: byRegion.id, cityName: byRegion.name };
  return matchCityFromAddress(address, displayName);
};

const resolveChainTag = (
  item: any,
  address: string,
  displayName: string
): { chainId: string; chainName: string } => {
  if (item.chainId) {
    const byId = RETAIL_CHAINS.find((c) => c.id === item.chainId);
    if (byId) return { chainId: byId.id, chainName: byId.name };
  }
  const matched =
    resolveChain(item.chainName) ??
    resolveChain(item.chain) ??
    RETAIL_CHAINS.find(
      (c) =>
        displayName.toLowerCase().includes(c.name.toLowerCase()) ||
        address.toLowerCase().includes(c.name.toLowerCase())
    );
  if (matched) return { chainId: matched.id, chainName: matched.name };
  return { chainId: 'retail_store', chainName: displayName.split(' ')[0] || 'Store' };
};

/**
 * Normalizes one record from any supported shape (RAW_FULL wrapper, CLEAN_ARRAY,
 * CLEAN_GEOJSON, or a bare Google Places payload) into a PlaceItem.
 */
export const normalizeImportedItem = (item: any, idx: number): PlaceItem => {
  const raw = (item?.rawData && typeof item.rawData === 'object' ? item.rawData : item) || {};

  const displayName =
    asString(
      typeof item.displayName === 'object' && item.displayName !== null
        ? item.displayName.text
        : item.displayName
    ) ||
    asString(item.name) ||
    asString(raw.displayName?.text ?? raw.name) ||
    asString(item.chainName) ||
    asString(item.chain) ||
    'Store';

  const address =
    asString(item.formattedAddress) ||
    asString(item.address) ||
    asString(raw.formattedAddress) ||
    '';

  const { cityId, cityName } = resolveCoverageTag(item, address, displayName);
  const { chainId, chainName } = resolveChainTag(item, address, displayName);

  const place: PlaceItem = {
    id: asString(item.id) || asString(raw.id) || `imported-${idx}-${Date.now()}`,
    chainId,
    chainName,
    cityId,
    cityName,
    regionId: asString(item.regionId) || undefined,
    regionName: asOptionalLabel(item.region),
    localityName: asOptionalLabel(item.locality),
    displayName,
    formattedAddress: address,
    location: {
      latitude: Number(item.location?.latitude ?? item.latitude ?? raw.location?.latitude ?? 48.8566),
      longitude: Number(item.location?.longitude ?? item.longitude ?? raw.location?.longitude ?? 2.3522),
    },
    rating: typeof item.rating === 'number' ? item.rating : raw.rating,
    userRatingCount:
      typeof item.userRatingCount === 'number' ? item.userRatingCount : raw.userRatingCount,
    googleMapsUri: item.googleMapsUri ?? raw.googleMapsUri,
    websiteUri: item.websiteUri ?? raw.websiteUri,
    nationalPhoneNumber: item.nationalPhoneNumber || item.phoneNumber || raw.nationalPhoneNumber,
    businessStatus: item.businessStatus ?? raw.businessStatus,
    types: item.types ?? raw.types,
    primaryType: item.primaryType ?? raw.primaryType,
    regularOpeningHours: item.regularOpeningHours ?? raw.regularOpeningHours,
    restroom: item.restroom ?? raw.restroom,
    priceLevel: item.priceLevel ?? raw.priceLevel,
    reviews: item.reviews ?? raw.reviews,
    editorialSummary: item.editorialSummary ?? raw.editorialSummary,
    generativeSummary: item.generativeSummary ?? raw.generativeSummary,
    reviewSummary: item.reviewSummary ?? raw.reviewSummary,
    fetchedAt: asString(item.fetchedAt) || new Date().toISOString(),
    rawData: raw,
  };

  return enrichPlace(place);
};

/** Accepts an Array (RAW_FULL / CLEAN_ARRAY / bare Places payload) or a GeoJSON FeatureCollection. */
export const parseDataset = (json: unknown): PlaceItem[] | null => {
  if (Array.isArray(json)) {
    return json.map(normalizeImportedItem);
  }
  const doc = json as any;
  if (doc?.type === 'FeatureCollection' && Array.isArray(doc.features)) {
    return doc.features.map((feat: any, idx: number) =>
      normalizeImportedItem(
        {
          ...(feat.properties || {}),
          address: feat.properties?.address || feat.properties?.formattedAddress,
          location: {
            longitude: feat.geometry?.coordinates?.[0],
            latitude: feat.geometry?.coordinates?.[1],
          },
          rawData: feat,
        },
        idx
      )
    );
  }
  return null;
};
