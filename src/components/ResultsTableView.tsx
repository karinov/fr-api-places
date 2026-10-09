import React, { useState, useEffect } from 'react';
import { PlaceItem } from '../types';
import { Search, Star, ExternalLink, MapPin, Eye, Phone, Globe, Filter, X, Trash2, Download, ArrowUp, ArrowDown, ArrowUpDown, Minus, Check } from 'lucide-react';
import { RETAIL_CHAINS } from '../data/retailChains';
import { getLocalityName, getRegionName, localityLabel, regionLabel, UNKNOWN_LABEL } from '../utils/geo';

interface ResultsTableViewProps {
  places: PlaceItem[];
  onSelectPlace: (place: PlaceItem) => void;
  onClearData?: () => void;
  onDeletePlace?: (place: PlaceItem) => void;
  onDeletePlaces?: (places: PlaceItem[]) => boolean | void;
}

export const ResultsTableView: React.FC<ResultsTableViewProps> = ({ places, onSelectPlace, onClearData, onDeletePlace, onDeletePlaces }) => {
  const handleExportExcel = () => {
    if (places.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const headers = ['Brand', 'Region', 'City', 'Overview', 'Image 1', 'Image 2'];
    
    const rows = places.map((place) => {
      const brand = place.chainName || '';
      const region = regionLabel(place) || '';
      const city = localityLabel(place) || '';
      
      const overview = (
        place.generativeSummary?.overview?.text ||
        place.generativeSummary?.description?.text ||
        place.editorialSummary?.text ||
        place.reviewSummary?.text?.text ||
        ''
      ).replace(/\n/g, ' ').replace(/"/g, '""');

      const savedKey = localStorage.getItem('GCP_PLACES_API_KEY') || '';
      const photos = place.rawData?.photos || [];
      const img1 = photos[0]?.name 
        ? `https://places.googleapis.com/v1/${photos[0].name}/media?key=${savedKey}&maxHeightPx=800&maxWidthPx=800`
        : '';
      const img2 = photos[1]?.name
        ? `https://places.googleapis.com/v1/${photos[1].name}/media?key=${savedKey}&maxHeightPx=800&maxWidthPx=800`
        : '';

      return [
        `"${brand.replace(/"/g, '""')}"`,
        `"${region.replace(/"/g, '""')}"`,
        `"${city.replace(/"/g, '""')}"`,
        `"${overview}"`,
        `"${img1}"`,
        `"${img2}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `matrix_brand_location_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [search, setSearch] = useState('');
  const [chainFilter, setChainFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [ratingSort, setRatingSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pageSize = 15;

  const toggleRatingSort = () => {
    setRatingSort((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? 'none' : 'desc'));
    setPage(1);
  };

  const getDisplayName = (place: PlaceItem): string => {
    if (typeof place.displayName === 'string') return place.displayName;
    if (typeof place.displayName === 'object' && place.displayName !== null) {
      return (place.displayName as any).text || place.chainName || 'Store';
    }
    return place.chainName || 'Store';
  };

  const getAddress = (place: PlaceItem): string => {
    return place.formattedAddress || 'France';
  };

  const getChainName = (place: PlaceItem): string => {
    return place.chainName || 'Retail';
  };

  const regionsList = Array.from(new Set(places.map((p) => getRegionName(p)))).sort();
  const citiesList = Array.from(new Set(places.map((p) => getLocalityName(p)))).sort();

  const filteredPlaces = places.filter((p) => {
    const dName = getDisplayName(p).toLowerCase();
    const addr = getAddress(p).toLowerCase();
    const cName = getChainName(p).toLowerCase();
    const region = getRegionName(p).toLowerCase();
    const city = getLocalityName(p).toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch =
      dName.includes(q) || addr.includes(q) || cName.includes(q) || region.includes(q) || city.includes(q);
    const matchesChain = chainFilter === 'ALL' || p.chainId === chainFilter;
    const matchesRegion = regionFilter === 'ALL' || getRegionName(p) === regionFilter;
    const matchesCity = cityFilter === 'ALL' || getLocalityName(p) === cityFilter;
    return matchesSearch && matchesChain && matchesRegion && matchesCity;
  });

  const sortedPlaces = [...filteredPlaces];
  if (ratingSort !== 'none') {
    sortedPlaces.sort((a, b) => {
      const ra = a.userRatingCount;
      const rb = b.userRatingCount;
      if (ra == null && rb == null) return 0;
      if (ra == null) return 1;
      if (rb == null) return -1;
      return ratingSort === 'asc' ? ra - rb : rb - ra;
    });
  }

  const totalPages = Math.ceil(sortedPlaces.length / pageSize) || 1;
  const paginatedPlaces = sortedPlaces.slice((page - 1) * pageSize, page * pageSize);

  // Drop selections that no longer exist in the dataset
  useEffect(() => {
    setSelectedIds((prev) => {
      const existing = prev.filter((id) => places.some((p) => p.id === id));
      return existing.length === prev.length ? prev : existing;
    });
  }, [places]);

  const toggleRowSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const pageIds = paginatedPlaces.map((p) => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.includes(id)) && !allOnPageSelected;

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      if (allOnPageSelected) {
        return prev.filter((id) => !pageIds.includes(id));
      }
      const set = new Set(prev);
      pageIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(Array.from(new Set(filteredPlaces.map((p) => p.id))));
  };

  const clearSelection = () => setSelectedIds([]);

  const selectedPlaces = places.filter((p) => selectedIds.includes(p.id));

  const handleBulkDelete = () => {
    if (selectedPlaces.length === 0 || !onDeletePlaces) return;
    const ok = onDeletePlaces(selectedPlaces);
    if (ok) setSelectedIds([]);
  };

  const getChainColor = (chainId: string) => {
    const chain = RETAIL_CHAINS.find((c) => c.id === chainId);
    return chain ? chain.color : '#475569';
  };

  return (
    <div className="bg-white border border-[#141414] p-5 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 font-mono">
        <div>
          <h3 className="font-serif italic text-lg font-bold text-[#141414] flex items-center gap-2">
            <span>Crawled Retail Store Inventory</span>
            <span className="px-2 py-0.5 border border-[#141414] font-mono text-[10px] uppercase font-bold bg-[#141414] text-white">
              {places.length} RECORDS
            </span>
          </h3>
          <p className="text-xs font-mono text-[#141414] opacity-70 mt-0.5">
            Structured store record nodes extracted via GCP Places Text Search query workers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {places.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-700 font-mono text-xs uppercase font-bold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Export matrix brand & location to Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT EXCEL (CSV)</span>
            </button>
          )}
          {onClearData && places.length > 0 && (
            <button
              onClick={onClearData}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-700 font-mono text-xs uppercase font-bold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Reset & clear all JSON data"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>RESET DATA JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4 font-mono text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#141414] opacity-50" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search store name, address..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#141414] text-[#141414] focus:outline-none"
          />
        </div>

        <div>
          <select
            value={chainFilter}
            onChange={(e) => {
              setChainFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 bg-white border border-[#141414] text-[#141414] focus:outline-none"
          >
            <option value="ALL">All Retail Chains ({places.length})</option>
            {RETAIL_CHAINS.map((c) => {
              const count = places.filter((p) => p.chainId === c.id).length;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <select
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 bg-white border border-[#141414] text-[#141414] focus:outline-none"
          >
            <option value="ALL">All Regions ({regionsList.length})</option>
            {regionsList.map((region) => {
              const count = places.filter((p) => getRegionName(p) === region).length;
              return (
                <option key={region} value={region}>
                  {region} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-1.5 bg-white border border-[#141414] text-[#141414] focus:outline-none"
          >
            <option value="ALL">All Cities ({citiesList.length})</option>
            {citiesList.map((city) => {
              const count = places.filter((p) => getLocalityName(p) === city).length;
              return (
                <option key={city} value={city}>
                  {city} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Bulk selection toolbar */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-rose-700 bg-rose-50 p-2.5 font-mono text-xs">
          <span className="font-bold text-rose-900 uppercase">
            {selectedIds.length} STORE DIPILIH
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={selectAllFiltered}
              className="px-2.5 py-1 border border-[#141414] bg-white text-[#141414] hover:bg-[#F0EFED] uppercase font-bold transition cursor-pointer"
            >
              SELECT ALL FILTERED ({filteredPlaces.length})
            </button>
            <button
              onClick={clearSelection}
              className="px-2.5 py-1 border border-[#141414] bg-white text-[#141414] hover:bg-[#F0EFED] uppercase font-bold transition cursor-pointer"
            >
              CLEAR SELECTION
            </button>
            {onDeletePlaces && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 border border-rose-700 bg-rose-700 text-white hover:bg-rose-800 uppercase font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                DELETE SELECTED ({selectedPlaces.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table - High Density Grid Table */}
      <div className="overflow-x-auto border border-[#141414]">
        <table className="w-full text-left border-collapse font-mono text-[11px]">
          <thead>
            <tr className="bg-[#F0EFED] border-b border-[#141414]">
              <th className="py-2.5 px-3 border-r border-[#141414] w-8">
                <button
                  onClick={toggleSelectPage}
                  disabled={pageIds.length === 0}
                  className="w-3.5 h-3.5 border border-[#141414] bg-white flex items-center justify-center disabled:opacity-40 cursor-pointer hover:bg-[#F0EFED]"
                  title="Pilih semua di halaman ini"
                >
                  {allOnPageSelected ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : someOnPageSelected ? (
                    <Minus className="w-3 h-3 stroke-[3]" />
                  ) : null}
                </button>
              </th>
              <th className="py-2.5 px-3 border-r border-[#141414] font-serif italic text-xs uppercase opacity-70">Chain</th>
              <th className="py-2.5 px-3 border-r border-[#141414] font-serif italic text-xs uppercase opacity-70">Store Name</th>
              <th className="py-2.5 px-3 border-r border-[#141414] font-serif italic text-xs uppercase opacity-70">Region</th>
              <th className="py-2.5 px-3 border-r border-[#141414] font-serif italic text-xs uppercase opacity-70">City</th>
              <th className="py-2.5 px-3 border-r border-[#141414] font-serif italic text-xs uppercase opacity-70">Address</th>
              <th className="py-2.5 px-3 border-r border-[#141414] font-serif italic text-xs uppercase opacity-70">
                <button
                  onClick={toggleRatingSort}
                  className="inline-flex items-center gap-1 cursor-pointer hover:opacity-100"
                  title="Sort by number of ratings (review count)"
                >
                  <span>Rating</span>
                  {ratingSort === 'desc' ? (
                    <ArrowDown className="w-3.5 h-3.5" />
                  ) : ratingSort === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-3 font-serif italic text-xs uppercase opacity-70 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlaces.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#141414] opacity-50 italic border-b border-[#141414]">
                  {places.length === 0
                    ? 'No store records extracted yet. Run extraction engine from Config tab.'
                    : 'No store records matching current query filter.'}
                </td>
              </tr>
            ) : (
              paginatedPlaces.map((place) => (
                <tr key={place.id + place.cityId} className="hover:bg-[#F7F6F5] transition border-b border-[#141414]">
                  <td className="py-2 px-3 border-r border-[#141414]">
                    <button
                      onClick={() => toggleRowSelected(place.id)}
                      className="w-3.5 h-3.5 border border-[#141414] bg-white flex items-center justify-center cursor-pointer hover:bg-[#F0EFED]"
                      title={selectedIds.includes(place.id) ? 'Batal pilih' : 'Pilih store'}
                    >
                      {selectedIds.includes(place.id) && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  </td>
                  <td className="py-2 px-3 border-r border-[#141414] whitespace-nowrap">
                    <span
                      className="inline-block px-1.5 py-0.5 border border-[#141414] text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: getChainColor(place.chainId) }}
                    >
                      {getChainName(place)}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-[#141414] font-bold text-[#141414]">
                    <div className="truncate max-w-[200px]" title={getDisplayName(place)}>
                      {getDisplayName(place)}
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-[#141414] text-[#141414] whitespace-nowrap">
                    {getRegionName(place) === UNKNOWN_LABEL ? (
                      <span className="opacity-40">--</span>
                    ) : (
                      <span className="uppercase">{getRegionName(place)}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 border-r border-[#141414] text-[#141414] whitespace-nowrap">
                    {getLocalityName(place) === UNKNOWN_LABEL ? (
                      <span className="opacity-40">--</span>
                    ) : (
                      getLocalityName(place)
                    )}
                  </td>
                  <td className="py-2 px-3 border-r border-[#141414] text-[#141414] opacity-80 max-w-xs truncate" title={getAddress(place)}>
                    {getAddress(place)}
                  </td>
                  <td className="py-2 px-3 border-r border-[#141414] whitespace-nowrap">
                    {place.rating ? (
                      <div className="flex items-center gap-1 font-bold text-amber-700">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                        <span>{place.rating}</span>
                        <span className="text-gray-500 text-[9px] font-normal">
                          ({place.userRatingCount || 0})
                        </span>
                      </div>
                    ) : (
                      <span className="opacity-40">--</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onSelectPlace(place)}
                        className="p-1 border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white transition cursor-pointer"
                        title="Inspect Raw JSON"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {place.googleMapsUri && (
                        <a
                          href={place.googleMapsUri}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white transition"
                          title="Open in Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {onDeletePlace && (
                        <button
                          onClick={() => onDeletePlace(place)}
                          className="p-1 border border-rose-700 text-rose-700 hover:bg-rose-700 hover:text-white transition cursor-pointer"
                          title="Hapus store ini (masukkan ke blacklist)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between font-mono text-xs text-[#141414]">
          <div>
            SHOWING {(page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, filteredPlaces.length)} OF {filteredPlaces.length} NODES
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 border border-[#141414] bg-white hover:bg-[#F0EFED] disabled:opacity-40 uppercase"
            >
              PREV
            </button>
            <span className="px-2 font-bold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 border border-[#141414] bg-white hover:bg-[#F0EFED] disabled:opacity-40 uppercase"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
