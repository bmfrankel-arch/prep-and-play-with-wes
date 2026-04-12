'use client';

import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-2 right-2 z-50 bg-navy text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-fade-in">
      ✈️ Offline Mode
    </div>
  );
}
