import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Database,
  Terminal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { ExtractionProgress, ExtractionLog, ExtractionConfig } from '../types';

interface ExtractionControlProps {
  progress: ExtractionProgress;
  logs: ExtractionLog[];
  config: ExtractionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ExtractionConfig>>;
  onStart: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
  onClearLogs: () => void;
  onClearData?: () => void;
  placesCount?: number;
  isValidatedKey: boolean;
  deletedCount?: number;
  onClearBlacklist?: () => void;
}

export const ExtractionControl: React.FC<ExtractionControlProps> = ({
  progress,
  logs,
  config,
  setConfig,
  onStart,
  onPauseToggle,
  onStop,
  onClearLogs,
  onClearData,
  placesCount = 0,
  isValidatedKey,
  deletedCount = 0,
  onClearBlacklist,
}) => {
  const [showLogs, setShowLogs] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const totalCombinations = config.selectedChainIds.length * config.selectedCityIds.length;
  const progressPercent =
    progress.totalTasks > 0
      ? Math.round((progress.completedTasks / progress.totalTasks) * 100)
      : 0;

  return (
    <div className="bg-white border border-[#141414] p-5 shadow-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif italic text-lg font-bold text-[#141414] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#141414]" />
            <span>Retail Data Extraction Engine</span>
          </h3>
          <p className="text-xs font-mono text-[#141414] opacity-70 mt-1">
            Automated queries: {config.selectedChainIds.length} Chains ×{' '}
            {config.selectedCityIds.length} Cities ={' '}
            <strong className="text-[#141414] font-bold">{totalCombinations} QUERY UNITS</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 text-xs font-mono uppercase tracking-wider border border-[#141414] bg-white text-[#141414] hover:bg-[#F0EFED] transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>CONFIG</span>
          </button>

          {!progress.isRunning && onClearData && placesCount > 0 && (
            <button
              onClick={onClearData}
              className="px-3 py-2 text-xs font-mono uppercase tracking-wider border border-rose-700 bg-rose-50 text-rose-700 hover:bg-rose-100 transition inline-flex items-center gap-1.5 cursor-pointer"
              title="Reset all crawled data"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>RESET DATA ({placesCount})</span>
            </button>
          )}

          {!progress.isRunning && deletedCount > 0 && onClearBlacklist && (
            <button
              onClick={onClearBlacklist}
              className="px-3 py-2 text-xs font-mono uppercase tracking-wider border border-[#141414] bg-white text-[#141414] hover:bg-[#F0EFED] transition inline-flex items-center gap-1.5 cursor-pointer"
              title="Kosongkan daftar lokasi invalid yang dihapus (blacklist)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>BLACKLIST ({deletedCount})</span>
            </button>
          )}

          {!progress.isRunning ? (
            <button
              onClick={onStart}
              disabled={
                totalCombinations === 0 || (!isValidatedKey && !config.apiKey)
              }
              className="px-5 py-2 bg-[#141414] hover:bg-black disabled:opacity-40 text-white font-mono text-xs uppercase tracking-widest border border-[#141414] transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>RUN GLOBAL EXTRACT ({totalCombinations})</span>
            </button>
          ) : (
            <>
              <button
                onClick={onPauseToggle}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs uppercase tracking-wider border border-[#141414] transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {progress.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>RESUME</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>PAUSE</span>
                  </>
                )}
              </button>

              <button
                onClick={onStop}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-mono text-xs uppercase tracking-wider border border-[#141414] transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>STOP</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Settings Drawer */}
      {showSettings && (
        <div className="mt-4 p-4 bg-[#F0EFED] border border-[#141414] grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <label className="font-bold text-[#141414] block mb-1 uppercase text-[10px]">
              Request Delay (ms):
            </label>
            <input
              type="number"
              min="100"
              max="5000"
              step="100"
              value={config.delayMs}
              onChange={(e) =>
                setConfig({ ...config, delayMs: parseInt(e.target.value) || 300 })
              }
              className="w-full px-2.5 py-1.5 bg-white border border-[#141414] text-[#141414] focus:outline-none"
            />
            <span className="text-[10px] opacity-70 mt-1 block">
              GCP rate limit throttle guard.
            </span>
          </div>

          <div>
            <label className="font-bold text-[#141414] block mb-1 uppercase text-[10px]">
              Search Radius (meters):
            </label>
            <input
              type="number"
              min="5000"
              max="50000"
              step="5000"
              value={config.radiusMeters}
              onChange={(e) =>
                setConfig({
                  ...config,
                  radiusMeters: parseInt(e.target.value) || 20000,
                })
              }
              className="w-full px-2.5 py-1.5 bg-white border border-[#141414] text-[#141414] focus:outline-none"
            />
            <span className="text-[10px] opacity-70 mt-1 block">
              Default: 20,000m (20km) radial bounds.
            </span>
          </div>

          <div>
            <label className="font-bold text-[#141414] block mb-1 uppercase text-[10px]">
              Language Header:
            </label>
            <select
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-[#141414] text-[#141414] focus:outline-none"
            >
              <option value="fr">French (fr)</option>
              <option value="en">English (en)</option>
            </select>
            <span className="text-[10px] opacity-70 mt-1 block">
              Places API response locale code.
            </span>
          </div>

          {/* Enterprise Data Fields Checkboxes */}
          <div className="col-span-1 sm:col-span-3 border-t border-[#141414] pt-3 mt-1">
            <label className="font-bold text-[#141414] block mb-2 uppercase text-[10px]">
              Enterprise SKU & AI Data Fields (Uncheck to fetch basic data only):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <label className="flex items-center gap-2 p-2 bg-white border border-[#141414] cursor-pointer hover:bg-[#F7F6F5]">
                <input
                  type="checkbox"
                  checked={config.includeEditorialSummary ?? true}
                  onChange={(e) =>
                    setConfig({ ...config, includeEditorialSummary: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-[#141414]"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold block text-[#141414]">Editorial Summary</span>
                  <span className="text-[9px] opacity-60">places.editorialSummary</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white border border-[#141414] cursor-pointer hover:bg-[#F7F6F5]">
                <input
                  type="checkbox"
                  checked={config.includeGenerativeSummary ?? true}
                  onChange={(e) =>
                    setConfig({ ...config, includeGenerativeSummary: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-[#141414]"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold block text-purple-900">Generative AI Summary</span>
                  <span className="text-[9px] opacity-60">places.generativeSummary</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white border border-[#141414] cursor-pointer hover:bg-[#F7F6F5]">
                <input
                  type="checkbox"
                  checked={config.includeReviewSummary ?? true}
                  onChange={(e) =>
                    setConfig({ ...config, includeReviewSummary: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-[#141414]"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold block text-purple-900">Review AI Summary</span>
                  <span className="text-[9px] opacity-60">places.reviewSummary</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white border border-[#141414] cursor-pointer hover:bg-[#F7F6F5]">
                <input
                  type="checkbox"
                  checked={config.includeReviews ?? true}
                  onChange={(e) =>
                    setConfig({ ...config, includeReviews: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-[#141414]"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold block text-amber-900">Visitor Reviews</span>
                  <span className="text-[9px] opacity-60">places.reviews</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white border border-[#141414] cursor-pointer hover:bg-[#F7F6F5]">
                <input
                  type="checkbox"
                  checked={config.includeRestroom ?? true}
                  onChange={(e) =>
                    setConfig({ ...config, includeRestroom: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-[#141414]"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold block text-blue-900">Restroom Availability</span>
                  <span className="text-[9px] opacity-60">places.restroom</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white border border-[#141414] cursor-pointer hover:bg-[#F7F6F5]">
                <input
                  type="checkbox"
                  checked={config.includePriceLevel ?? true}
                  onChange={(e) =>
                    setConfig({ ...config, includePriceLevel: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-[#141414]"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold block text-emerald-900">Price Level</span>
                  <span className="text-[9px] opacity-60">places.priceLevel</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar & Status - High Density Green Terminal Style */}
      {progress.isRunning && (
        <div className="mt-4 p-4 bg-[#141414] text-[#00FF41] border border-[#141414] font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00FF41] animate-pulse" />
              <span className="text-xs uppercase">
                {progress.isPaused ? '[PAUSED]' : '> PROCESSING:'} {progress.currentChain} IN{' '}
                {progress.currentCity}
              </span>
            </div>
            <span className="text-xs">
              {progress.completedTasks} / {progress.totalTasks} TASKS ({progressPercent}%)
            </span>
          </div>

          <div className="w-full bg-gray-800 h-2 border border-[#00FF41]/40 mb-3 overflow-hidden">
            <div
              className="bg-[#00FF41] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase border-t border-gray-800 pt-2 text-[#00FF41]/80">
            <div>
              FOUND: <span className="text-white font-bold">{progress.foundCount}</span>
            </div>
            <div>
              DUPLICATES: <span className="text-amber-400 font-bold">{progress.duplicateCount}</span>
            </div>
            <div>
              ERRORS: <span className="text-rose-400 font-bold">{progress.errorCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Log Terminal Window */}
      <div className="mt-4 border border-[#141414]">
        <div
          onClick={() => setShowLogs(!showLogs)}
          className="px-3.5 py-2 bg-[#F0EFED] hover:bg-[#DCDAD7] flex items-center justify-between font-mono text-xs text-[#141414] border-b border-[#141414] cursor-pointer transition select-none"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#141414]" />
            <span className="font-bold">SYSTEM LOG CONSOLE ({logs.length})</span>
          </div>

          <div className="flex items-center gap-3">
            {logs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearLogs();
                }}
                className="hover:underline text-[10px] uppercase font-bold"
              >
                CLEAR LOGS
              </button>
            )}
            {showLogs ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {showLogs && (
          <div className="bg-[#141414] text-[#00FF41] p-3 h-44 overflow-y-auto font-mono text-[10px] leading-relaxed flex flex-col-reverse select-text">
            {logs.length === 0 ? (
              <div className="text-[#00FF41]/50 italic py-2">
                &gt; System idle. Click "RUN GLOBAL EXTRACT" to execute thread pool queries...
              </div>
            ) : (
              logs.slice().reverse().map((log) => (
                <div key={log.id} className="flex items-start gap-2 py-0.5">
                  <span className="text-[#00FF41]/50 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-[#00FF41]'
                        : log.type === 'error'
                        ? 'text-rose-400 font-bold'
                        : log.type === 'warn'
                        ? 'text-amber-300'
                        : 'text-gray-300'
                    }
                  >
                    &gt; {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
