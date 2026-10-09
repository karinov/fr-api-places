import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';

interface ApiKeySectionProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  isValidated: boolean;
  setIsValidated: (valid: boolean) => void;
}

export const ApiKeySection: React.FC<ApiKeySectionProps> = ({
  apiKey,
  setApiKey,
  isValidated,
  setIsValidated,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [hasEnvKey, setHasEnvKey] = useState(false);

  useEffect(() => {
    // Check backend health for environment key
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasEnvKey) {
          setHasEnvKey(true);
          if (!apiKey) {
            setIsValidated(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationMessage(null);

    try {
      const res = await fetch('/api/places/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await res.json();
      setIsValidated(data.valid);
      setValidationMessage(data.message || (data.valid ? 'API Key valid!' : 'API Key invalid.'));
    } catch (err: any) {
      setIsValidated(false);
      setValidationMessage('Error connecting to backend server to test API key.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="bg-white border border-[#141414] p-5 shadow-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#DCDAD7] text-[#141414] border border-[#141414] shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif italic text-base font-bold text-[#141414]">
                GCP Configuration & API Credentials
              </h2>
              {isValidated ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#141414] font-mono text-[10px] uppercase font-bold bg-green-100 text-green-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-700" /> API: ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#141414] font-mono text-[10px] uppercase font-bold bg-amber-100 text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> PENDING VALIDATION
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-[#141414] opacity-70 mt-1">
              Provide Google Cloud API Key with Places API (New) enabled to run extraction threads.
            </p>
          </div>
        </div>

        <a
          href="https://console.cloud.google.com/google/maps-apis/start"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase underline text-[#141414] hover:opacity-70 self-start md:self-auto shrink-0"
        >
          <span>Get GCP API Key</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsValidated(false);
              setValidationMessage(null);
            }}
            placeholder={
              hasEnvKey
                ? 'Detected GOOGLE_MAPS_PLATFORM_KEY from environment (or type custom key)'
                : 'AIzaSyB*******************'
            }
            className="w-full pl-3 pr-10 py-2 font-mono text-xs bg-white border border-[#141414] text-[#141414] focus:outline-none focus:bg-[#F7F6F5]"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#141414] opacity-50 hover:opacity-100"
            title={showKey ? 'Hide' : 'Show'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleValidate}
          disabled={isValidating || (!apiKey.trim() && !hasEnvKey)}
          className="px-4 py-2 bg-[#141414] hover:bg-black disabled:opacity-40 text-white font-mono text-xs uppercase tracking-widest border border-[#141414] transition inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          {isValidating ? (
            <>
              <div className="w-3.5 h-3.5 border border-white border-t-transparent animate-spin" />
              <span>TESTING...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>VALIDATE KEY</span>
            </>
          )}
        </button>
      </div>

      {validationMessage && (
        <div
          className={`mt-3 p-2 border border-[#141414] font-mono text-[11px] flex items-center gap-2 ${
            isValidated
              ? 'bg-green-100 text-green-950'
              : 'bg-rose-100 text-rose-950'
          }`}
        >
          {isValidated ? (
            <CheckCircle2 className="w-4 h-4 text-green-800 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-800 shrink-0" />
          )}
          <span>{validationMessage}</span>
        </div>
      )}

      {hasEnvKey && !apiKey && (
        <div className="mt-2 text-[11px] font-mono text-[#141414] opacity-80 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Server detected active <code>GOOGLE_MAPS_PLATFORM_KEY</code> in environment. Engine ready for queries.</span>
        </div>
      )}
    </div>
  );
};
