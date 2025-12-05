'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { BunUtils } from '@/lib/bun-utils';

// Runtime type checking utility for dashboard components
function useBunNativeDetection() {
  const [bunNativeInfo, setBunNativeInfo] = useState<{
    isBunEnvironment: boolean;
    nativeObjects: string[];
    checkedObjects: number;
  }>({
    isBunEnvironment: false,
    nativeObjects: [],
    checkedObjects: 0
  });

  useEffect(() => {
    // Check various objects for Bun native types
    const objectsToCheck = [
      { name: 'Dashboard Component', obj: Dashboard },
      { name: 'BunUtils Class', obj: BunUtils },
      { name: 'Empty Object', obj: {} },
      { name: 'Array', obj: [] },
      { name: 'Date', obj: new Date() },
      { name: 'Function', obj: () => {} },
    ];

    const nativeObjects: string[] = [];
    let checkedCount = 0;

    objectsToCheck.forEach(({ name, obj }) => {
      checkedCount++;
      if (BunUtils.isBunNative(obj)) {
        nativeObjects.push(name);
      }
    });

    setBunNativeInfo({
      isBunEnvironment: typeof window !== 'undefined' && 'Bun' in window,
      nativeObjects,
      checkedObjects: checkedCount
    });
  }, []);

  return bunNativeInfo;
}

// Development component to show Bun native detection
function BunNativeInfo() {
  const bunInfo = useBunNativeDetection();
  
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs max-w-xs z-50">
      <div className="font-semibold mb-2">🔍 Bun Native Detection</div>
      <div className="space-y-1">
        <div>Environment: {bunInfo.isBunEnvironment ? '✅ Bun' : '⚡ Standard'}</div>
        <div>Objects checked: {bunInfo.checkedObjects}</div>
        <div>Native objects: {bunInfo.nativeObjects.length}</div>
        {bunInfo.nativeObjects.length > 0 && (
          <div className="text-green-400">
            {bunInfo.nativeObjects.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [showBunInfo, setShowBunInfo] = useState(false);

  // Development: Show Bun native detection info
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setShowBunInfo(true);
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setShowBunInfo(false), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <Dashboard />
      {showBunInfo && <BunNativeInfo />}
    </>
  );
}
