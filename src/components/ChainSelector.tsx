import React, { useState } from 'react';
import { RETAIL_CHAINS } from '../data/retailChains';
import { Store, Check, Search, CheckSquare, Square, Filter } from 'lucide-react';

interface ChainSelectorProps {
  selectedChainIds: string[];
  onChange: (chainIds: string[]) => void;
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({ selectedChainIds, onChange }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', ...Array.from(new Set(RETAIL_CHAINS.map((c) => c.category)))];

  const filteredChains = RETAIL_CHAINS.filter((chain) => {
    const matchesSearch =
      chain.name.toLowerCase().includes(search.toLowerCase()) ||
      chain.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || chain.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const allSelected = RETAIL_CHAINS.every((c) => selectedChainIds.includes(c.id));
  const noneSelected = selectedChainIds.length === 0;

  const toggleChain = (id: string) => {
    if (selectedChainIds.includes(id)) {
      onChange(selectedChainIds.filter((item) => item !== id));
    } else {
      onChange([...selectedChainIds, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(RETAIL_CHAINS.map((c) => c.id));
  };

  const handleSelectNone = () => {
    onChange([]);
  };

  return (
    <div className="bg-white border border-[#141414] p-5 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif italic text-base font-bold text-[#141414]">Target Retail Chains</h3>
            <span className="px-2 py-0.5 border border-[#141414] font-mono text-[10px] uppercase font-bold bg-[#141414] text-white">
              {selectedChainIds.length} / {RETAIL_CHAINS.length} SELECTED
            </span>
            <span className="px-2 py-0.5 border border-[#141414] font-mono text-[10px] uppercase font-bold bg-amber-100 text-amber-900 border-amber-900">
              FR RETAIL MAP BY Lignedebus.com
            </span>
          </div>
          <p className="text-xs font-mono text-[#141414] opacity-70 mt-0.5">
            Select retail brands to crawl for store locations across France (Credit: FR RETAIL MAP BY Lignedebus.com).
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            placeholder="Search chain (Decathlon, IKEA, Lidl...)"
            className="w-full pl-8 pr-3 py-1.5 font-mono text-xs bg-white border border-[#141414] text-[#141414] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-[10px]">
          <Filter className="w-3.5 h-3.5 text-[#141414] shrink-0 ml-1 opacity-50" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 border border-[#141414] uppercase font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              {cat === 'ALL' ? 'ALL CAT' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
        {filteredChains.map((chain) => {
          const isSelected = selectedChainIds.includes(chain.id);
          return (
            <button
              key={chain.id}
              onClick={() => toggleChain(chain.id)}
              className={`p-2 border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer font-mono text-xs ${
                isSelected
                  ? 'border-[#141414] bg-[#141414] text-[#E4E3E0]'
                  : 'border-[#141414] bg-white text-[#141414] hover:bg-[#F0EFED]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold shrink-0 border border-white/20"
                  style={{ backgroundColor: chain.color }}
                >
                  {chain.logoLetter}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">{chain.name}</div>
                  <div className={`text-[9px] truncate ${isSelected ? 'text-gray-300' : 'opacity-60'}`}>
                    {chain.category}
                  </div>
                </div>
              </div>

              <div
                className={`w-3.5 h-3.5 border border-[#141414] flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-white text-[#141414]' : 'bg-white'
                }`}
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
