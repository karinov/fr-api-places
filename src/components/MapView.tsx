import React, { useState, useRef, useMemo } from 'react';
import { PlaceItem } from '../types';
import { APIProvider, Map, Marker, InfoWindow, useApiIsLoaded } from '@vis.gl/react-google-maps';
import { RETAIL_CHAINS } from '../data/retailChains';
import { FRENCH_CITIES } from '../data/frenchCities';
import {
  MapPin,
  Star,
  Navigation,
  ExternalLink,
  AlertTriangle,
  Camera,
  Filter,
  Edit3,
  X,
  Sliders,
} from 'lucide-react';
import { toJpeg } from 'html-to-image';

interface MapViewProps {
  places: PlaceItem[];
  apiKey: string;
  selectedChainIds?: string[];
  selectedCityIds?: string[];
}

interface MarkerItemProps {
  key?: React.Key;
  place: PlaceItem;
  color: string;
  onSelect: (p: PlaceItem) => void;
}

// Small hollow bullet: white fill, pastel red outline (4px), center anchor
const PIN_OUTLINE_COLOR = '#FF6961';
const PIN_FILL_COLOR = '#FFFFFF';

function MarkerItem({ place, color, onSelect }: MarkerItemProps) {
  const [open, setOpen] = useState(false);
  const apiLoaded = useApiIsLoaded();

  const icon = useMemo(
    () =>
      apiLoaded
        ? ({
            path: 'M 0,-4 A 4,4 0 1,0 0,4 A 4,4 0 1,0 0,-4 Z',
            fillColor: PIN_FILL_COLOR,
            fillOpacity: 1,
            strokeColor: PIN_OUTLINE_COLOR,
            strokeOpacity: 1,
            strokeWeight: 4,
            scale: 1,
            anchor: new google.maps.Point(0, 0),
          } as google.maps.Symbol)
        : undefined,
    [apiLoaded]
  );

  const displayNameStr =
    (typeof place.displayName === 'object' && place.displayName !== null
      ? (place.displayName as any).text
      : place.displayName) ||
    place.chainName ||
    'Store';
  const chainNameStr = place.chainName || 'Store';
  const addressStr = place.formattedAddress || '';

  return (
    <>
      <Marker
        position={{ lat: place.location.latitude, lng: place.location.longitude }}
        icon={icon}
        onClick={() => {
          setOpen(true);
          onSelect(place);
        }}
        title={`${chainNameStr} - ${displayNameStr}`}
      />

      {open && (
        <InfoWindow
          position={{ lat: place.location.latitude, lng: place.location.longitude }}
          onCloseClick={() => setOpen(false)}
        >
          <div className="p-1 max-w-xs font-sans">
            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white mb-1"
              style={{ backgroundColor: color }}
            >
              {chainNameStr}
            </span>
            <h4 className="font-semibold text-xs text-slate-900 leading-tight mb-1">
              {displayNameStr}
            </h4>
            <p className="text-[11px] text-slate-600 mb-1.5">{addressStr}</p>

            {place.rating && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 mb-2">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                <span>{place.rating}</span>
                <span className="text-slate-400 font-normal">
                  ({place.userRatingCount || 0} reviews)
                </span>
              </div>
            )}

            {place.googleMapsUri && (
              <a
                href={place.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

const snazzyWyMapStyles = [
  { featureType: 'all', elementType: 'geometry.fill', stylers: [{ weight: '2.00' }] },
  { featureType: 'all', elementType: 'geometry.stroke', stylers: [{ color: '#9c9c9c' }] },
  { featureType: 'all', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#f2f2f2' }] },
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'all', stylers: [{ saturation: -100 }, { lightness: 45 }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7b7b7b' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'all', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road.arterial', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'all', stylers: [{ color: '#46bcec' }, { visibility: 'on' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c8d7d4' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#070707' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

export const MapView: React.FC<MapViewProps> = ({
  places,
  apiKey,
  selectedChainIds,
  selectedCityIds,
}) => {
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('ALL');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('ALL');
  const [customTitle, setCustomTitle] = useState<string>('');
  const mapFrameRef = useRef<HTMLDivElement>(null);

  const keyToUse =
    apiKey ||
    localStorage.getItem('GCP_PLACES_API_KEY') ||
    localStorage.getItem('GEO_PULL_API_KEY') ||
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  const getChainColor = (chainId: string) => {
    const chain = RETAIL_CHAINS.find((c) => c.id === chainId);
    return chain ? chain.color : '#2563EB';
  };

  // Filter places based on selected chain & city filters
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (selectedChainFilter !== 'ALL' && p.chainId !== selectedChainFilter) return false;
      if (selectedCityFilter !== 'ALL' && p.cityId !== selectedCityFilter) return false;
      return true;
    });
  }, [places, selectedChainFilter, selectedCityFilter]);

  // Dynamic Map Title generator: e.g. "Decathlon Stores Around Strasbourg" or custom title override
  const getDynamicTitle = () => {
    if (customTitle.trim()) {
      return customTitle.trim();
    }

    const activeChainObj =
      selectedChainFilter !== 'ALL'
        ? RETAIL_CHAINS.find((c) => c.id === selectedChainFilter)
        : null;

    const activeCityObj =
      selectedCityFilter !== 'ALL'
        ? FRENCH_CITIES.find((c) => c.id === selectedCityFilter)
        : null;

    if (activeChainObj) {
      const cityText = activeCityObj ? activeCityObj.name : 'France';
      return `${activeChainObj.name} Stores Around ${cityText}`;
    }

    // Multi-chain dynamic title logic
    const activeChains = Array.from(new Set(filteredPlaces.map((p) => p.chainId)))
      .map((id) => RETAIL_CHAINS.find((c) => c.id === id))
      .filter((c): c is typeof RETAIL_CHAINS[0] => Boolean(c));

    const activeCities = Array.from(new Set(filteredPlaces.map((p) => p.cityId)))
      .map((id) => FRENCH_CITIES.find((c) => c.id === id))
      .filter((c): c is typeof FRENCH_CITIES[0] => Boolean(c));

    let cityText = 'France';
    if (activeCityObj) {
      cityText = activeCityObj.name;
    } else if (activeCities.length === 1 && activeCities[0]) {
      cityText = activeCities[0].name;
    } else if (activeCities.length === 2 && activeCities[0] && activeCities[1]) {
      cityText = `${activeCities[0].name} & ${activeCities[1].name}`;
    } else if (activeCities.length > 2 && activeCities.length < FRENCH_CITIES.length) {
      cityText = activeCities.slice(0, 2).map((c) => c.name).join(', ');
    }

    let chainText = 'Retail';
    if (activeChains.length === 1 && activeChains[0]) {
      chainText = activeChains[0].name;
    } else if (activeChains.length >= 1 && activeChains.length <= 3) {
      chainText = activeChains.map((c) => c.name).join(' ');
    } else if (activeChains.length > 3 && activeChains.length < RETAIL_CHAINS.length) {
      chainText = `${activeChains.slice(0, 2).map((c) => c.name).join(' ')} +${activeChains.length - 2}`;
    }

    return `${chainText} Stores Around ${cityText}`.replace(/\s+/g, ' ').trim();
  };

  const mapTitle = getDynamicTitle();

  const handleCaptureMap = async () => {
    if (!mapFrameRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await toJpeg(mapFrameRef.current, {
        quality: 0.95,
        cacheBust: false,
        skipFonts: true,
        pixelRatio: 2,
        filter: (node) => {
          if (node.tagName === 'IFRAME') return false;
          return true;
        },
      });
      const link = document.createElement('a');
      const filename = `${mapTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Map.jpg`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture map JPG:', err);
      alert(
        'Failed to capture map image due to CORS/Google Maps tile restrictions. Try zooming/panning slightly or use Snipping Tool (Win+Shift+S).'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Default center of France
  const defaultCenter = { lat: 46.603354, lng: 1.888334 };
  const defaultZoom = 6;

  if (!keyToUse) {
    return (
      <div className="bg-white border border-[#141414] p-6 text-center shadow-none font-mono">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <h3 className="font-serif italic text-base font-bold text-[#141414]">
          Google Maps API Key Missing
        </h3>
        <p className="text-xs text-[#141414] opacity-70 max-w-md mx-auto mt-1">
          Interactive map projection requires a GCP Platform Key. Please populate credentials in
          configuration panel above.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#141414] p-5 shadow-none space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        <div>
          <h3 className="font-jakarta text-lg font-bold text-[#141414] flex items-center gap-2 flex-wrap">
            <Navigation className="w-4 h-4 text-[#141414]" />
            <span>{mapTitle}</span>
            <span className="px-2 py-0.5 border border-[#141414] text-[10px] uppercase font-bold bg-[#141414] text-white font-mono">
              {filteredPlaces.length} OF {places.length} PINS
            </span>
            <span className="px-2 py-0.5 border border-[#141414] text-[10px] uppercase font-bold bg-sky-100 text-sky-950 border-sky-950 font-mono">
              WY MAP STYLE
            </span>
          </h3>
          <p className="text-xs text-[#141414] opacity-70 mt-0.5">
            Geographic coordinates of extracted retail chains across French municipalities.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Capture Map Button */}
          <button
            type="button"
            onClick={handleCaptureMap}
            disabled={isCapturing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-[#141414] font-mono text-xs uppercase font-bold bg-[#141414] text-white hover:bg-[#2e2e2e] transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            title="Capture map frame as JPG including top title & bottom credit"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>{isCapturing ? 'CAPTURING JPG...' : 'CAPTURE MAP (JPG)'}</span>
          </button>

          {/* Credit Badge */}
          <div className="p-2 bg-[#141414] text-white border-2 border-[#141414] font-mono text-[11px] shrink-0 hidden md:block">
            <span className="opacity-60 text-[9px] uppercase block">Credit:</span>
            <span className="font-jakarta font-bold text-amber-400">
              FR RETAIL MAP BY Lignedebus.com
            </span>
          </div>
        </div>
      </div>

      {/* Map Control & Filter Panel */}
      <div className="bg-[#F4F3F1] border-2 border-[#141414] p-3.5 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#141414]">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>Map Display & Filter Controls</span>
          </div>
          {(selectedChainFilter !== 'ALL' || selectedCityFilter !== 'ALL' || customTitle) && (
            <button
              onClick={() => {
                setSelectedChainFilter('ALL');
                setSelectedCityFilter('ALL');
                setCustomTitle('');
              }}
              className="text-[10px] uppercase font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters & Title</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          {/* 1. Custom Title Input */}
          <div className="md:col-span-1">
            <label className="block text-[11px] uppercase font-bold text-[#141414] mb-1 flex items-center gap-1">
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Custom Map Title:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Example: Decathlon Stores Around Strasbourg"
                className="w-full px-2.5 py-1.5 border-2 border-[#141414] text-xs font-medium bg-white text-[#141414] focus:outline-none focus:bg-amber-50"
              />
              {customTitle && (
                <button
                  onClick={() => setCustomTitle('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear custom title"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Filter Chain */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-[#141414] mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Retail Chain (Pins):</span>
            </label>
            <select
              value={selectedChainFilter}
              onChange={(e) => setSelectedChainFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border-2 border-[#141414] text-xs font-medium bg-white text-[#141414] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Retail Chains ({places.length} Stores)</option>
              {RETAIL_CHAINS.map((chain) => {
                const count = places.filter((p) => p.chainId === chain.id).length;
                if (count === 0) return null;
                return (
                  <option key={chain.id} value={chain.id}>
                    {chain.name} ({count} stores)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Filter City */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-[#141414] mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filter City (Municipality):</span>
            </label>
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border-2 border-[#141414] text-xs font-medium bg-white text-[#141414] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Cities ({places.length} Stores)</option>
              {FRENCH_CITIES.map((city) => {
                const count = places.filter((p) => p.cityId === city.id).length;
                if (count === 0) return null;
                return (
                  <option key={city.id} value={city.id}>
                    {city.name} ({count} stores)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#141414]/15 text-[10px]">
          <span className="font-bold opacity-60 uppercase mr-1">Quick Chain Filter:</span>
          <button
            onClick={() => setSelectedChainFilter('ALL')}
            className={`px-2 py-0.5 border border-[#141414] font-semibold cursor-pointer transition ${
              selectedChainFilter === 'ALL'
                ? 'bg-[#141414] text-white'
                : 'bg-white text-[#141414] hover:bg-slate-200'
            }`}
          >
            All ({places.length})
          </button>
          {RETAIL_CHAINS.map((chain) => {
            const count = places.filter((p) => p.chainId === chain.id).length;
            if (count === 0) return null;
            const isSelected = selectedChainFilter === chain.id;
            return (
              <button
                key={chain.id}
                onClick={() => setSelectedChainFilter(chain.id)}
                className={`px-2 py-0.5 border border-[#141414] font-semibold cursor-pointer transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#141414] text-white'
                    : 'bg-white text-[#141414] hover:bg-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: chain.color }}
                ></span>
                <span>{chain.name}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Display Frame */}
      <div
        ref={mapFrameRef}
        className="w-full h-[620px] border-[10px] border-[#141414] relative bg-[#c8d7d4] overflow-hidden"
      >
        <APIProvider apiKey={keyToUse} version="weekly" language="en">
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
            styles={snazzyWyMapStyles}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {filteredPlaces.map((place) => (
              <MarkerItem
                key={place.id + place.cityId}
                place={place}
                color={getChainColor(place.chainId)}
                onSelect={setSelectedPlace}
              />
            ))}
          </Map>
        </APIProvider>

        {/* Map Overlay Credit - Lignedebus (Positioned flush on bottom edge) */}
        <div className="absolute bottom-0 left-0 z-10 bg-[#141414] text-white p-2.5 px-3.5 border-t-2 border-r-2 border-[#141414] text-xs shadow-md">
          <div className="font-jakarta text-[9px] uppercase tracking-widest text-amber-400 font-bold mb-0.5">
            FR RETAIL MAP BY
          </div>
          <div className="font-jakarta font-bold text-sm text-white tracking-wide">
            Lignedebus.com
          </div>
        </div>
      </div>
    </div>
  );
};
