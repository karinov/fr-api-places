import React, { useState } from 'react';
import { FRENCH_CITIES } from '../data/frenchCities';
import { MapPin, Check, Search, CheckSquare, Square, Navigation, Landmark, Globe2 } from 'lucide-react';

interface CitySelectorProps {
  selectedCityIds: string[];
  onChange: (cityIds: string[]) => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ selectedCityIds, onChange }) => {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  const regions = ['ALL', ...Array.from(new Set(FRENCH_CITIES.map((c) => c.region)))];

  const filteredCities = FRENCH_CITIES.filter((city) => {
    const matchesSearch =
      city.name.toLowerCase().includes(search.toLowerCase()) ||
      city.region.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'ALL' || city.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const allSelected = FRENCH_CITIES.every((c) => selectedCityIds.includes(c.id));
  const noneSelected = selectedCityIds.length === 0;

  const isRegion = (level?: string) => level === 'region';
  const isTerritory = (level?: string) => level === 'territory';
  const isNational = (level?: string) => level === 'national';
  const isSpecial = (level?: string) => isRegion(level) || isTerritory(level) || isNational(level);

  const toggleCity = (id: string) => {
    if (selectedCityIds.includes(id)) {
      onChange(selectedCityIds.filter((item) => item !== id));
    } else {
      onChange([...selectedCityIds, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(FRENCH_CITIES.map((c) => c.id));
  };

  const handleSelectTop10 = () => {
    const top10Ids = FRENCH_CITIES.filter((c) => c.level === 'city')
      .sort((a, b) => b.population - a.population)
      .slice(0, 10)
      .map((c) => c.id);
    onChange(top10Ids);
  };

  const handleSelectAllCities = () => {
    onChange(FRENCH_CITIES.filter((c) => c.level === 'city').map((c) => c.id));
  };

  const handleSelectAllRegions = () => {
    onChange(
      FRENCH_CITIES.filter((c) => isRegion(c.level) || isTerritory(c.level)).map((c) => c.id)
    );
  };

  const handleSelectNone = () => {
    onChange([]);
  };

  return (
    <div className="bg-white border border-[#141414] p-5 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif italic text-base font-bold text-[#141414]">Coverage Matrix (Cities, Regions & Territories)</h3>
            <span className="px-2 py-0.5 border border-[#141414] font-mono text-[10px] uppercase font-bold bg-[#141414] text-white">
              {selectedCityIds.length} / {FRENCH_CITIES.length} SELECTED
            </span>
          </div>
          <p className="text-xs font-mono text-[#141414] opacity-70 mt-0.5">
            National, regional, city and overseas coordinate centers across France.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSelectTop10}
            className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border border-[#141414] bg-white hover:bg-[#F0EFED] text-[#141414] transition inline-flex items-center gap-1 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>TOP 10 CITIES</span>
          </button>
          <button
            onClick={handleSelectAllCities}
            className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border border-sky-800 bg-sky-50 hover:bg-sky-100 text-sky-950 transition inline-flex items-center gap-1 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>ALL CITIES</span>
          </button>
          <button
            onClick={handleSelectAllRegions}
            className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border border-sky-800 bg-sky-800 hover:bg-sky-900 text-white transition inline-flex items-center gap-1 cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>ALL REGIONS</span>
          </button>
          <button
            onClick={handleSelectAll}
            disabled={allSelected}
            className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border border-[#141414] bg-white hover:bg-[#F0EFED] disabled:opacity-40 text-[#141414] transition inline-flex items-center gap-1 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>SELECT ALL</span>
          </button>
          <button
            onClick={handleSelectNone}
            disabled={noneSelected}
            className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border border-[#141414] bg-white hover:bg-[#F0EFED] disabled:opacity-40 text-[#141414] transition inline-flex items-center gap-1 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" />
            <span>CLEAR</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#141414] opacity-50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city, region or territory (Paris, Occitanie, La Réunion...)"
            className="w-full pl-8 pr-3 py-1.5 font-mono text-xs bg-white border border-[#141414] text-[#141414] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-[10px]">
          {regions.map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-2 py-1 border border-[#141414] uppercase font-bold whitespace-nowrap transition cursor-pointer ${
                selectedRegion === reg
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              {reg === 'ALL' ? 'ALL REGIONS' : reg}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
        {filteredCities.map((city) => {
          const isSelected = selectedCityIds.includes(city.id);
          const region = isRegion(city.level);
          const territory = isTerritory(city.level);
          const national = isNational(city.level);
          const special = isSpecial(city.level);

          const tileClass = territory
            ? isSelected
              ? 'border-amber-800 bg-amber-700 text-white'
              : 'border-amber-700 bg-amber-50 text-amber-950 hover:bg-amber-100'
            : region
            ? isSelected
              ? 'border-sky-900 bg-sky-800 text-white'
              : 'border-sky-800 bg-sky-50 text-sky-950 hover:bg-sky-100'
            : national
            ? isSelected
              ? 'border-emerald-900 bg-emerald-800 text-white'
              : 'border-emerald-800 bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
            : isSelected
            ? 'border-[#141414] bg-[#141414] text-[#E4E3E0]'
            : 'border-[#141414] bg-white text-[#141414] hover:bg-[#F0EFED]';

          const badge = territory ? 'TERRITORY' : region ? 'REGION' : national ? 'NATIONAL' : null;
          const badgeIcon = territory
            ? <Globe2 className="w-2.5 h-2.5" />
            : region
            ? <Landmark className="w-2.5 h-2.5" />
            : <MapPin className="w-2.5 h-2.5" />;

          return (
            <button
              key={city.id}
              onClick={() => toggleCity(city.id)}
              className={`p-2 border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer font-mono text-xs ${tileClass}`}
            >
              <div className="flex items-start gap-1.5 min-w-0">
                <MapPin
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    special ? 'text-current opacity-70' : isSelected ? 'text-[#00FF41]' : 'text-[#141414] opacity-50'
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px] font-bold truncate">{city.name}</span>
                    {badge && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-bold border border-current rounded-sm leading-none">
                        {badgeIcon}
                        {badge}
                      </span>
                    )}
                  </div>
                  <div className={`text-[9px] truncate ${isSelected ? 'opacity-80' : 'opacity-60'}`}>{city.region}</div>
                </div>
              </div>

              <div
                className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                  special ? 'border-current' : 'border-[#141414]'
                } ${isSelected ? 'bg-white text-[#141414]' : 'bg-white'}`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
