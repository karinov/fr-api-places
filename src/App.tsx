import React, { useState, useEffect, useRef } from 'react';
import {
  PlaceItem,
  ExtractionProgress,
  ExtractionLog,
  ExtractionConfig,
} from './types';
import { RETAIL_CHAINS } from './data/retailChains';
import { FRENCH_CITIES } from './data/frenchCities';
import { enrichPlace } from './utils/geo';
import { ApiKeySection } from './components/ApiKeySection';
import { ChainSelector } from './components/ChainSelector';
import { CitySelector } from './components/CitySelector';
import { ExtractionControl } from './components/ExtractionControl';
import { ResultsTableView } from './components/ResultsTableView';
import { JsonViewer } from './components/JsonViewer';
import { MapView } from './components/MapView';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import {
  Store,
  MapPin,
  Database,
  Table as TableIcon,
  Map as MapIcon,
  FileCode,
  Sparkles,
  Download,
  Info,
  Layers,
} from 'lucide-react';

const DELETED_IDS_STORAGE_KEY = 'DELETED_PLACE_IDS';
const SAVED_PLACES_STORAGE_KEY = 'SAVED_PLACES_JSON';

export default function App() {
  const [activeTab, setActiveTab] = useState<'CONTROL' | 'TABLE' | 'MAP' | 'JSON'>('CONTROL');
  
  // API Key & Config State
  const [apiKey, setApiKey] = useState<string>('');
  const [isValidatedKey, setIsValidatedKey] = useState<boolean>(false);
  const [config, setConfig] = useState<ExtractionConfig>({
    apiKey: '',
    selectedChainIds: RETAIL_CHAINS.map((c) => c.id),
    selectedCityIds: FRENCH_CITIES.map((c) => c.id),
    delayMs: 300,
    radiusMeters: 20000,
    maxResultsPerQuery: 20,
    language: 'fr',
    includeEditorialSummary: true,
    includeGenerativeSummary: true,
    includeReviewSummary: true,
    includeReviews: true,
    includeRestroom: true,
    includePriceLevel: true,
  });

  // Places & Extraction State
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [selectedPlaceModal, setSelectedPlaceModal] = useState<PlaceItem | null>(null);

  const [progress, setProgress] = useState<ExtractionProgress>({
    isRunning: false,
    isPaused: false,
    totalTasks: 0,
    completedTasks: 0,
    currentTaskIndex: 0,
    foundCount: 0,
    duplicateCount: 0,
    errorCount: 0,
  });

  const [logs, setLogs] = useState<ExtractionLog[]>([]);

  // Refs for async loop control
  const isCancelledRef = useRef(false);
  const isPausedRef = useRef(false);

  // Place IDs permanently removed by the user (never re-added on extraction/import)
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const [deletedCount, setDeletedCount] = useState(0);

  // Sync apiKey to config & localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('GCP_PLACES_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setConfig((prev) => ({ ...prev, apiKey: savedKey }));
    }

    // Load permanent blacklist of deleted place IDs
    const savedDeleted = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    if (savedDeleted !== null) {
      try {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) {
          deletedIdsRef.current = new Set(
            parsed.filter(
              (x): x is string => typeof x === 'string' && x !== '[object Object]'
            )
          );
          setDeletedCount(deletedIdsRef.current.size);
        }
      } catch (e) {}
    }

    const filterDeleted = (list: any[]): PlaceItem[] =>
      list
        .filter(
          (p: any) => p && typeof p.id === 'string' && !deletedIdsRef.current.has(p.id)
        )
        .map(enrichPlace);

    const savedPlaces = localStorage.getItem(SAVED_PLACES_STORAGE_KEY);
    if (savedPlaces !== null) {
      try {
        const parsed = JSON.parse(savedPlaces);
        if (Array.isArray(parsed)) {
          setPlaces(filterDeleted(parsed));
          return;
        }
      } catch (e) {}
    }

    // Fallback: Auto-load default dataset from public/places.json only if never saved/reset
    fetch('/places.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('No default dataset file found');
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlaces(filterDeleted(data));
        }
      })
      .catch(() => {});
  }, []);

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    setConfig((prev) => ({ ...prev, apiKey: newKey }));
    localStorage.setItem('GCP_PLACES_API_KEY', newKey);
  };

  const addLog = (
    message: string,
    type: ExtractionLog['type'] = 'info',
    chainName?: string,
    cityName?: string
  ) => {
    const newLog: ExtractionLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      message,
      type,
      chainName,
      cityName,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  // Persist places to localStorage
  const updatePlacesAndStore = (newPlaces: PlaceItem[]) => {
    setPlaces(newPlaces);
    try {
      localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(newPlaces));
    } catch (e) {
      console.warn('LocalStorage full, skipped saving raw payload cache');
    }
  };

  // Execution engine: Batch pull Places API
  const startExtraction = async () => {
    if (config.selectedChainIds.length === 0 || config.selectedCityIds.length === 0) {
      alert('Pilih setidaknya 1 Retail Chain dan 1 Kota!');
      return;
    }

    // Build task queue
    const tasks: Array<{ chain: typeof RETAIL_CHAINS[0]; city: typeof FRENCH_CITIES[0] }> = [];
    for (const chainId of config.selectedChainIds) {
      const chain = RETAIL_CHAINS.find((c) => c.id === chainId);
      if (!chain) continue;
      for (const cityId of config.selectedCityIds) {
        const city = FRENCH_CITIES.find((c) => c.id === cityId);
        if (!city) continue;
        tasks.push({ chain, city });
      }
    }

    isCancelledRef.current = false;
    isPausedRef.current = false;

    setProgress({
      isRunning: true,
      isPaused: false,
      totalTasks: tasks.length,
      completedTasks: 0,
      currentTaskIndex: 0,
      foundCount: places.length,
      duplicateCount: 0,
      errorCount: 0,
    });

    addLog(
      `Memulai ekstraksi ${tasks.length} kombinasi query (Retail × Kota)...`,
      'info'
    );

    let currentPlacesMap = new Map<string, PlaceItem>(places.map((p) => [p.id, p]));
    let foundNewCount = 0;
    let dupCount = 0;
    let errCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      if (isCancelledRef.current) {
        addLog('Proses ekstraksi dihentikan oleh pengguna.', 'warn');
        break;
      }

      // Check pause
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const { chain, city } = tasks[i];

      setProgress((prev) => ({
        ...prev,
        completedTasks: i,
        currentTaskIndex: i,
        currentChain: chain.name,
        currentCity: city.name,
      }));

      addLog(`Searching: "${chain.queryName} ${city.name}"`, 'info', chain.name, city.name);

      try {
        const response = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey,
            textQuery: `${chain.queryName} ${city.name}`,
            lat: city.lat,
            lng: city.lng,
            radiusMeters: Math.max(config.radiusMeters, city.radiusMeters || 0),
            languageCode: config.language,
            includeEditorialSummary: config.includeEditorialSummary,
            includeGenerativeSummary: config.includeGenerativeSummary,
            includeReviewSummary: config.includeReviewSummary,
            includeReviews: config.includeReviews,
            includeRestroom: config.includeRestroom,
            includePriceLevel: config.includePriceLevel,
          }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          const errMsg = data.error?.message || `HTTP ${response.status}`;
          addLog(`Error [${chain.name} - ${city.name}]: ${errMsg}`, 'error');
          errCount++;
        } else if (data.places && Array.isArray(data.places)) {
          let batchAdded = 0;
          data.places.forEach((p: any) => {
            const placeId = p.id || `${chain.id}-${city.id}-${Math.random()}`;
            // Skip places the user permanently blacklisted
            if (p.id && deletedIdsRef.current.has(p.id)) {
              return;
            }
            if (!currentPlacesMap.has(placeId)) {
              const item: PlaceItem = {
                id: placeId,
                chainId: chain.id,
                chainName: chain.name,
                cityId: city.id,
                cityName: city.name,
                displayName: p.displayName?.text || p.displayName || chain.name,
                formattedAddress: p.formattedAddress || `${city.name}, France`,
                location: {
                  latitude: p.location?.latitude ?? city.lat,
                  longitude: p.location?.longitude ?? city.lng,
                },
                rating: p.rating,
                userRatingCount: p.userRatingCount,
                googleMapsUri: p.googleMapsUri,
                websiteUri: p.websiteUri,
                nationalPhoneNumber: p.nationalPhoneNumber,
                businessStatus: p.businessStatus,
                types: p.types,
                primaryType: p.primaryType,
                regularOpeningHours: p.regularOpeningHours,
                restroom: p.restroom,
                priceLevel: p.priceLevel,
                reviews: p.reviews,
                editorialSummary: p.editorialSummary,
                generativeSummary: p.generativeSummary,
                reviewSummary: p.reviewSummary,
                fetchedAt: new Date().toISOString(),
                rawData: p,
              };
              currentPlacesMap.set(placeId, enrichPlace(item));
              batchAdded++;
              foundNewCount++;
            } else {
              dupCount++;
            }
          });

          addLog(
            `✔ Ditemukan ${data.places.length} toko (${batchAdded} baru, ${data.places.length - batchAdded} duplikat)`,
            'success',
            chain.name,
            city.name
          );
        } else {
          addLog(`Tidak ada toko ditemukan untuk "${chain.name} ${city.name}"`, 'info');
        }
      } catch (err: any) {
        addLog(`Gagal terhubung ke API: ${err.message}`, 'error');
        errCount++;
      }

      // Sync state & localstorage periodically
      const updatedList = Array.from(currentPlacesMap.values());
      updatePlacesAndStore(updatedList);

      setProgress((prev) => ({
        ...prev,
        foundCount: updatedList.length,
        duplicateCount: dupCount,
        errorCount: errCount,
      }));

      // Throttle delay between queries
      if (i < tasks.length - 1 && config.delayMs > 0) {
        await new Promise((res) => setTimeout(res, config.delayMs));
      }
    }

    setProgress((prev) => ({
      ...prev,
      isRunning: false,
      completedTasks: tasks.length,
    }));

    addLog(
      `Selesai! Total ${currentPlacesMap.size} toko ritel unik tersimpan dalam file JSON.`,
      'success'
    );
  };

  const handlePauseToggle = () => {
    isPausedRef.current = !isPausedRef.current;
    setProgress((prev) => ({ ...prev, isPaused: isPausedRef.current }));
  };

  const handleStop = () => {
    isCancelledRef.current = true;
    setProgress((prev) => ({ ...prev, isRunning: false, isPaused: false }));
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleClearData = () => {
    setPlaces([]);
    try {
      localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
    setProgress((prev) => ({
      ...prev,
      foundCount: 0,
      completedTasks: 0,
      currentTaskIndex: 0,
      duplicateCount: 0,
      errorCount: 0,
    }));
    addLog('Semua data toko telah dibersihkan.', 'info');
  };

  const handleImportJson = (importedPlaces: PlaceItem[]) => {
    const map = new Map<string, PlaceItem>(places.map((p) => [p.id, p]));
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    importedPlaces.forEach((p) => {
      if (deletedIdsRef.current.has(p.id)) {
        skippedCount++;
        return;
      }
      // Upsert: an incoming record that carries a valid coverage id must be able to
      // repair an existing one, otherwise a previously corrupted cityId never heals.
      const incoming = enrichPlace(p);
      if (map.has(p.id)) {
        const existing = map.get(p.id)!;
        if (
          incoming.cityId !== existing.cityId ||
          incoming.regionId !== existing.regionId ||
          incoming.localityName !== existing.localityName
        ) {
          updatedCount++;
        }
        map.set(p.id, { ...existing, ...incoming });
        return;
      }
      map.set(p.id, incoming);
      newCount++;
    });
    const updated = Array.from(map.values());
    updatePlacesAndStore(updated);
    addLog(
      `Berhasil mengimpor ${importedPlaces.length} toko (${newCount} data baru, ${updatedCount} diperbarui${
        skippedCount > 0 ? `, ${skippedCount} dilewati karena blacklist` : ''
      }).`,
      'success'
    );
  };

  const removePlacesByIds = (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return;

    uniqueIds.forEach((id) => deletedIdsRef.current.add(id));
    try {
      localStorage.setItem(
        DELETED_IDS_STORAGE_KEY,
        JSON.stringify(Array.from(deletedIdsRef.current))
      );
    } catch (e) {}
    setDeletedCount(deletedIdsRef.current.size);

    const idSet = new Set(uniqueIds);
    setPlaces((prev) => {
      const updated = prev.filter((p) => !idSet.has(p.id));
      try {
        localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedPlaceModal((prev) => (prev && idSet.has(prev.id) ? null : prev));
    addLog(`${uniqueIds.length} store dihapus & diblacklist.`, 'warn');
  };

  const handleDeletePlace = (placeOrId: PlaceItem | string) => {
    const placeId = typeof placeOrId === 'string' ? placeOrId : placeOrId?.id;
    if (!placeId) return;
    const confirmed = window.confirm(
      'Hapus store ini dari dataset? Lokasi juga akan diblacklist agar tidak muncul lagi saat ekstraksi ulang atau import.'
    );
    if (!confirmed) return;
    removePlacesByIds([placeId]);
  };

  const handleDeletePlaces = (items: Array<PlaceItem | string>): boolean => {
    const ids = items
      .map((item) => (typeof item === 'string' ? item : item?.id))
      .filter((id): id is string => Boolean(id));
    const uniqueCount = new Set(ids).size;
    if (uniqueCount === 0) return false;
    const confirmed = window.confirm(
      `Hapus ${uniqueCount} store dari dataset? Lokasi juga akan diblacklist agar tidak muncul lagi saat ekstraksi ulang atau import.`
    );
    if (!confirmed) return false;
    removePlacesByIds(ids);
    return true;
  };

  const handleClearBlacklist = () => {
    if (deletedIdsRef.current.size === 0) return;
    const confirmed = window.confirm(
      'Kosongkan blacklist? Lokasi yang pernah dihapus dapat muncul kembali saat ekstraksi ulang.'
    );
    if (!confirmed) return;

    deletedIdsRef.current = new Set();
    try {
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
    setDeletedCount(0);
    addLog('Blacklist lokasi invalid dikosongkan.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans select-none">
      {/* Top Navigation Bar - High Density Industrial Theme */}
      <header className="bg-[#DCDAD7] border-b border-[#141414] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-serif italic font-bold text-xl tracking-tight text-[#141414]">
              GeoPull.fr
            </span>
            <div className="h-4 w-[1px] bg-[#141414] opacity-30 hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#141414]">
                  Retail Data Extraction Engine v2.4.0
                </span>
                <span className="px-1.5 py-0.5 border border-[#141414] bg-white font-mono text-[9px] uppercase tracking-widest font-bold">
                  GCP PLACES API
                </span>
              </div>
              <p className="text-[11px] font-mono opacity-70">
                {RETAIL_CHAINS.length} Retail Chains × {FRENCH_CITIES.length} Coverage Points (Cities, Regions & Territories)
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 font-mono text-[11px] uppercase overflow-x-auto">
            <button
              onClick={() => setActiveTab('CONTROL')}
              className={`px-3 py-1.5 border border-[#141414] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CONTROL'
                  ? 'bg-[#141414] text-[#E4E3E0]'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>[01] Config & Pull</span>
            </button>

            <button
              onClick={() => setActiveTab('TABLE')}
              className={`px-3 py-1.5 border border-[#141414] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'TABLE'
                  ? 'bg-[#141414] text-[#E4E3E0]'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>[02] Stores ({places.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MAP')}
              className={`px-3 py-1.5 border border-[#141414] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MAP'
                  ? 'bg-[#141414] text-[#E4E3E0]'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>[03] Map Frame</span>
            </button>

            <button
              onClick={() => setActiveTab('JSON')}
              className={`px-3 py-1.5 border border-[#141414] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'JSON'
                  ? 'bg-[#141414] text-[#E4E3E0]'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>[04] Raw JSON</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* TAB 1: CONTROL & CONFIG */}
        {activeTab === 'CONTROL' && (
          <div className="space-y-6">
            <ApiKeySection
              apiKey={apiKey}
              setApiKey={handleApiKeyChange}
              isValidated={isValidatedKey}
              setIsValidated={setIsValidatedKey}
            />

            <ExtractionControl
              progress={progress}
              logs={logs}
              config={config}
              setConfig={setConfig}
              onStart={startExtraction}
              onPauseToggle={handlePauseToggle}
              onStop={handleStop}
              onClearLogs={handleClearLogs}
              onClearData={handleClearData}
              placesCount={places.length}
              isValidatedKey={isValidatedKey}
              deletedCount={deletedCount}
              onClearBlacklist={handleClearBlacklist}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChainSelector
                selectedChainIds={config.selectedChainIds}
                onChange={(ids) => setConfig({ ...config, selectedChainIds: ids })}
              />
              <CitySelector
                selectedCityIds={config.selectedCityIds}
                onChange={(ids) => setConfig({ ...config, selectedCityIds: ids })}
              />
            </div>
          </div>
        )}

        {/* TAB 2: DATA TABLE */}
        {activeTab === 'TABLE' && (
          <ResultsTableView
            places={places}
            onSelectPlace={(place) => setSelectedPlaceModal(place)}
            onClearData={handleClearData}
            onDeletePlace={handleDeletePlace}
            onDeletePlaces={handleDeletePlaces}
          />
        )}

        {/* TAB 3: MAP VISUALIZATION */}
        {activeTab === 'MAP' && (
          <MapView
            places={places}
            apiKey={apiKey}
            selectedChainIds={config.selectedChainIds}
            selectedCityIds={config.selectedCityIds}
          />
        )}

        {/* TAB 4: JSON EXPORT & VIEW */}
        {activeTab === 'JSON' && (
          <JsonViewer
            places={places}
            onImportJson={handleImportJson}
            onClearData={handleClearData}
          />
        )}
      </main>

      {/* Detail Modal */}
      <PlaceDetailModal
        place={selectedPlaceModal}
        onClose={() => setSelectedPlaceModal(null)}
        onDelete={handleDeletePlace}
      />

      {/* High Density Footer */}
      <footer className="h-10 border-t border-[#141414] bg-[#DCDAD7] flex items-center px-6 justify-between text-[#141414] font-mono text-[10px] uppercase">
        <div className="flex items-center gap-4">
          <span>Engine: Places API v1 (Text Search)</span>
          <div className="h-3 w-[1px] bg-[#141414] opacity-30"></div>
          <span className="opacity-70">Target: {RETAIL_CHAINS.length} Chains × {FRENCH_CITIES.length} Cities / Regions / Territories</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-emerald-800">
            {places.length} STORES COLLECTED IN JSON
          </span>
        </div>
      </footer>
    </div>
  );
}
