import React from 'react';
import { PlaceItem } from '../types';
import { X, MapPin, Phone, Globe, ExternalLink, Star, Calendar, Copy, Check, Trash2 } from 'lucide-react';
import { RETAIL_CHAINS } from '../data/retailChains';
import { getLocalityName, getRegionName, UNKNOWN_LABEL } from '../utils/geo';

interface PlaceDetailModalProps {
  place: PlaceItem | null;
  onClose: () => void;
  onDelete?: (place: PlaceItem) => void;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({ place, onClose, onDelete }) => {
  const [copied, setCopied] = React.useState(false);

  if (!place) return null;

  const chain = RETAIL_CHAINS.find((c) => c.id === place.chainId);
  const jsonString = JSON.stringify(place.rawData || place, null, 2);

  const displayNameStr =
    (typeof place.displayName === 'object' && place.displayName !== null
      ? (place.displayName as any).text
      : place.displayName) ||
    place.chainName ||
    'Store';

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#141414] shadow-none max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden font-mono">
        {/* Header */}
        <div className="p-4 border-b border-[#141414] flex items-start justify-between gap-3 bg-[#F0EFED]">
          <div>
            <span
              className="inline-block px-2 py-0.5 border border-[#141414] text-[10px] font-bold text-white uppercase mb-1"
              style={{ backgroundColor: chain?.color || '#141414' }}
            >
              {place.chainName}
            </span>
            <h3 className="font-serif italic text-xl font-bold text-[#141414] leading-tight">{displayNameStr}</h3>
            <div className="flex items-center gap-1.5 text-xs text-[#141414] opacity-70 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#141414]" />
              <span className="uppercase">{getRegionName(place)}</span>
              {getLocalityName(place) !== UNKNOWN_LABEL && (
                <>
                  <span className="opacity-50">&gt;</span>
                  <span>{getLocalityName(place)}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 border border-[#141414] text-[#141414] bg-white hover:bg-[#141414] hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F0EFED] p-3.5 border border-[#141414]">
            <div>
              <span className="opacity-60 block text-[10px] uppercase font-bold">Address:</span>
              <span className="text-[#141414] font-bold">{place.formattedAddress}</span>
            </div>
            <div>
              <span className="opacity-60 block text-[10px] uppercase font-bold">Google Place ID:</span>
              <code className="text-[#141414] bg-white border border-[#141414] px-1.5 py-0.5 text-[10px]">
                {place.id}
              </code>
            </div>
            <div>
              <span className="opacity-60 block text-[10px] uppercase font-bold">Coordinates (Lat/Lng):</span>
              <span className="text-[#141414] font-bold">
                {place.location.latitude.toFixed(6)}, {place.location.longitude.toFixed(6)}
              </span>
            </div>
            <div>
              <span className="opacity-60 block text-[10px] uppercase font-bold">Rating & Reviews:</span>
              {place.rating ? (
                <div className="flex items-center gap-1 font-bold text-amber-700">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>{place.rating}</span>
                  <span className="text-gray-500 font-normal">({place.userRatingCount || 0} reviews)</span>
                </div>
              ) : (
                <span className="opacity-40">No rating data</span>
              )}
            </div>
            {place.nationalPhoneNumber && (
              <div>
                <span className="opacity-60 block text-[10px] uppercase font-bold">Phone:</span>
                <span className="text-[#141414] font-bold">{place.nationalPhoneNumber}</span>
              </div>
            )}
            {place.websiteUri && (
              <div>
                <span className="opacity-60 block text-[10px] uppercase font-bold">Official Site:</span>
                <a
                  href={place.websiteUri}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 font-bold hover:underline flex items-center gap-1 truncate"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{place.websiteUri}</span>
                </a>
              </div>
            )}
            {place.priceLevel && (
              <div>
                <span className="opacity-60 block text-[10px] uppercase font-bold">Price Level:</span>
                <span className="text-emerald-800 font-bold">{place.priceLevel.replace('PRICE_LEVEL_', '')}</span>
              </div>
            )}
            {typeof place.restroom === 'boolean' && (
              <div>
                <span className="opacity-60 block text-[10px] uppercase font-bold">Restroom:</span>
                <span className={`font-bold ${place.restroom ? 'text-blue-700' : 'text-gray-500'}`}>
                  {place.restroom ? '🚻 Available' : 'No Public Restroom'}
                </span>
              </div>
            )}
          </div>

          {/* Regular Opening Hours */}
          {place.regularOpeningHours?.weekdayDescriptions && place.regularOpeningHours.weekdayDescriptions.length > 0 && (
            <div className="bg-[#F7F6F5] p-3.5 border border-[#141414]">
              <span className="font-bold uppercase text-[10px] text-[#141414] opacity-70 block mb-1">
                🕒 Opening Hours (Jam Buka Operasional):
              </span>
              <div className="space-y-1 font-mono text-[11px] text-[#141414] bg-white p-2 border border-[#141414]">
                {place.regularOpeningHours.weekdayDescriptions.map((dayDesc: string, idx: number) => (
                  <div key={idx} className="border-b border-[#E4E3E0] last:border-b-0 py-0.5">
                    {dayDesc}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editorial & Generative AI Summaries */}
          {(place.editorialSummary?.text || place.generativeSummary || place.reviewSummary) && (
            <div className="space-y-2.5 bg-[#F7F6F5] p-3.5 border border-[#141414]">
              {place.editorialSummary?.text && (
                <div>
                  <span className="font-bold uppercase text-[10px] text-[#141414] opacity-70 block mb-0.5">
                    📝 Editorial Summary (Google Editor):
                  </span>
                  <p className="text-[#141414] italic bg-white p-2 border border-[#141414] text-[11px] leading-relaxed">
                    "{place.editorialSummary.text}"
                  </p>
                </div>
              )}

              {(place.generativeSummary?.overview?.text || place.generativeSummary?.description?.text || place.reviewSummary?.text?.text) && (
                <div>
                  <span className="font-bold uppercase text-[10px] text-purple-900 block mb-0.5">
                    ✨ Generative AI Summary (Google AI):
                  </span>
                  <p className="text-purple-950 bg-purple-50 p-2 border border-[#141414] text-[11px] leading-relaxed">
                    {place.generativeSummary?.overview?.text ||
                      place.generativeSummary?.description?.text ||
                      place.reviewSummary?.text?.text}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Visitor Reviews List (places.reviews) */}
          {place.reviews && place.reviews.length > 0 && (
            <div className="space-y-2 border border-[#141414] p-3 bg-white">
              <div className="flex items-center justify-between border-b border-[#141414] pb-1.5 mb-2">
                <span className="font-bold uppercase text-[11px] text-[#141414] flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  Visitor Reviews ({place.reviews.length})
                </span>
                <span className="text-[10px] opacity-60">places.reviews</span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {place.reviews.map((rev, idx) => (
                  <div key={idx} className="p-2.5 bg-[#F0EFED] border border-[#141414] text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {rev.authorAttribution?.photoUri ? (
                          <img
                            src={rev.authorAttribution.photoUri}
                            alt={rev.authorAttribution?.displayName || 'Reviewer'}
                            className="w-5 h-5 rounded-full border border-[#141414] object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[9px] font-bold">
                            {(rev.authorAttribution?.displayName || 'U')[0]}
                          </div>
                        )}
                        <span className="font-bold text-[#141414] truncate max-w-[180px]">
                          {rev.authorAttribution?.displayName || 'Anonymous Visitor'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-bold text-amber-800">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                        <span>{rev.rating || 5}/5</span>
                      </div>
                    </div>

                    {rev.text?.text && (
                      <p className="text-[#141414] font-normal leading-relaxed bg-white p-2 border border-[#141414]">
                        {rev.text.text}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[9px] opacity-60 pt-0.5">
                      <span>{rev.relativePublishTimeDescription || rev.publishTime || 'Recent'}</span>
                      {rev.text?.languageCode && <span className="uppercase">Lang: {rev.text.languageCode}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON Code view */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#141414] uppercase text-[10px]">Raw Places API Payload JSON:</span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-white border border-[#141414] text-[#141414] hover:bg-[#F0EFED] uppercase text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'COPIED' : 'COPY JSON'}</span>
              </button>
            </div>
            <div className="bg-[#141414] text-[#00FF41] p-3 font-mono text-[10px] max-h-56 overflow-auto leading-tight border border-[#141414]">
              <pre>{jsonString}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#141414] bg-[#F0EFED] flex items-center justify-between gap-3">
          {place.googleMapsUri ? (
            <a
              href={place.googleMapsUri}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-[#141414] hover:bg-black text-white font-bold border border-[#141414] text-xs uppercase transition inline-flex items-center gap-1.5"
            >
              <span>View in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => onDelete(place)}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white border border-[#141414] font-bold text-xs uppercase transition inline-flex items-center gap-1.5 cursor-pointer"
                title="Hapus store ini (masukkan ke blacklist)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE STORE</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-gray-100 text-[#141414] border border-[#141414] font-bold text-xs uppercase transition cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
