'use client';

import { useEffect, useState } from 'react';

/**
 * Cookie consent banner minimalista. Localstorage persiste decisão.
 * LGPD compliance: site não seta cookies tracking sem aceite explícito.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('consent-v1');
    if (!seen) setVisible(true);
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('consent-v1', 'accepted');
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem('consent-v1', 'declined');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-xl border border-purple-500/40 bg-slate-900/95 p-4 shadow-xl backdrop-blur">
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
        <div className="flex-1 text-sm text-slate-200">
          🍪 A gente usa cookies essenciais pra funcionar.{' '}
          <a href="/privacy" className="underline hover:text-white">
            Saiba mais
          </a>
          .
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDecline}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Recusar
          </button>
          <button
            onClick={handleAccept}
            className="rounded-md bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
