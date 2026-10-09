import React, { useState, useMemo } from 'react';
import { PlaceItem } from '../types';
import { RETAIL_CHAINS } from '../data/retailChains';
import { FRENCH_CITIES } from '../data/frenchCities';
import { buildDataset, parseDataset, type DatasetFormat } from '../utils/dataset';
import {
  Download,
  Copy,
  Check,
  Upload,
  FileCode,
  Trash2,
  FileSpreadsheet,
  Braces,
  Maximize2,
  Minimize2,
  Filter,
  MapPin,
  Sliders,
  X,
} from 'lucide-react';

interface JsonViewerProps {
  places: PlaceItem[];
  onImportJson: (importedPlaces: PlaceItem[]) => void;
  onClearData: () => void;
}


export const JsonViewer: React.FC<JsonViewerProps> = ({ places, onImportJson, onClearData }) => {
  const [copied, setCopied] = useState(false);
  const [formatType, setFormatType] = useState<DatasetFormat>('RAW_FULL');
  const [expanded, setExpanded] = useState(false);
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('ALL');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('ALL');

  // Filter places based on selected chain & city filters
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (selectedChainFilter !== 'ALL' && p.chainId !== selectedChainFilter) return false;
      if (selectedCityFilter !== 'ALL' && p.cityId !== selectedCityFilter) return false;
      return true;
    });
  }, [places, selectedChainFilter, selectedCityFilter]);

  // Format dataset based on selected view & filtered places
  const formattedJsonString = JSON.stringify(
    buildDataset(filteredPlaces, formatType),
    null,
    2
  );
  const fileSizeKb = (new Blob([formattedJsonString]).size / 1024).toFixed(1);

  const handleDownload = () => {
    const filename = `france_retail_places_${formatType.toLowerCase()}_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    const blob = new Blob([formattedJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseDataset(JSON.parse(event.target?.result as string));
        if (!parsed) {
          alert('Format file JSON tidak sesuai.');
          return;
        }
        onImportJson(parsed);
      } catch (err) {
        alert('File JSON tidak valid atau format tidak sesuai.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white border-2 border-[#141414] p-5 shadow-none space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Braces className="w-4 h-4 text-[#141414]" />
            <h3 className="font-serif italic text-lg font-bold text-[#141414]">Raw JSON Payload Node</h3>
            <span className="px-2 py-0.5 border border-[#141414] text-[10px] font-bold bg-[#141414] text-white uppercase">
              {fileSizeKb} KB ({filteredPlaces.length} OF {places.length} ITEMS)
            </span>
          </div>
          <p className="text-xs text-[#141414] opacity-70 mt-0.5">
            Export & stream full Places API JSON payloads or GeoJSON structures with active store/city filters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <label className="px-3 py-1.5 bg-white hover:bg-[#F0EFED] text-[#141414] border border-[#141414] uppercase font-semibold transition cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>IMPORT JSON</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleCopy}
            disabled={filteredPlaces.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-[#F0EFED] disabled:opacity-40 text-[#141414] border border-[#141414] uppercase font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED!' : 'COPY JSON'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={filteredPlaces.length === 0}
            className="px-4 py-1.5 bg-[#141414] hover:bg-black disabled:opacity-40 text-white border border-[#141414] uppercase font-semibold tracking-wider transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD JSON</span>
          </button>

          <button
            onClick={onClearData}
            disabled={places.length === 0}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 border border-rose-700 uppercase font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
            title="Reset & clear all collected JSON dataset"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>RESET DATA JSON</span>
          </button>
        </div>
      </div>

      {/* JSON Dynamic Filter Controls Panel */}
      <div className="bg-[#F4F3F1] border-2 border-[#141414] p-3.5 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#141414]">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>JSON Filter Controls (Store & City)</span>
          </div>
          {(selectedChainFilter !== 'ALL' || selectedCityFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedChainFilter('ALL');
                setSelectedCityFilter('ALL');
              }}
              className="text-[10px] uppercase font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset JSON Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          {/* 1. Filter Chain */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-[#141414] mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Retail Chain (Store):</span>
            </label>
            <select
              value={selectedChainFilter}
              onChange={(e) => setSelectedChainFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border-2 border-[#141414] text-xs font-medium bg-white text-[#141414] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Retail Chains ({places.length} Total Stores)</option>
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

          {/* 2. Filter City */}
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
              <option value="ALL">All Cities ({places.length} Total Stores)</option>
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

      {/* Format Switcher */}
      <div className="flex items-center justify-between gap-2 bg-[#F0EFED] p-2 border-2 border-[#141414] font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase text-[10px]">FORMAT:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFormatType('RAW_FULL')}
              className={`px-2.5 py-1 border border-[#141414] uppercase text-[10px] font-bold transition cursor-pointer ${
                formatType === 'RAW_FULL'
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              Raw Google Places
            </button>
            <button
              onClick={() => setFormatType('CLEAN_ARRAY')}
              className={`px-2.5 py-1 border border-[#141414] uppercase text-[10px] font-bold transition cursor-pointer ${
                formatType === 'CLEAN_ARRAY'
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              Clean Array
            </button>
            <button
              onClick={() => setFormatType('CLEAN_GEOJSON')}
              className={`px-2.5 py-1 border border-[#141414] uppercase text-[10px] font-bold transition cursor-pointer ${
                formatType === 'CLEAN_GEOJSON'
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              GeoJSON
            </button>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#141414] p-1 border border-[#141414] bg-white hover:bg-[#DCDAD7] cursor-pointer"
          title={expanded ? 'Minimize' : 'Expand'}
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* JSON Code View - High Density Terminal */}
      <div
        className={`bg-[#141414] text-[#00FF41] p-4 font-mono text-[10px] overflow-auto leading-tight border-2 border-[#141414] select-text ${
          expanded ? 'h-[600px]' : 'h-80'
        }`}
      >
        <pre>{formattedJsonString}</pre>
      </div>
    </div>
  );
};
