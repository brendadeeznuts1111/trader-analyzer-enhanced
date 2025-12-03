import { useState, useEffect, useCallback, useRef } from 'react';

// Generic data fetching hook with caching and error handling
export function useDataFetch<T>(
  url: string,
  options: {
    enabled?: boolean;
    cacheTime?: number;
    retryCount?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    enabled = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    retryCount = 3,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache implementation
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const fetchData = useCallback(
    async (attempt = 0) => {
      if (!enabled) return;

      const cached = cacheRef.current.get(url);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        setLoading(false);
        setError(null);
        onSuccess?.(cached.data);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
        setLoading(false);

        // Cache the result
        cacheRef.current.set(url, { data: result, timestamp: Date.now() });

        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');

        if (attempt < retryCount) {
          // Exponential backoff retry
          setTimeout(() => fetchData(attempt + 1), Math.pow(2, attempt) * 1000);
          return;
        }

        setError(error);
        setLoading(false);
        onError?.(error);
      }
    },
    [url, enabled, cacheTime, retryCount, onSuccess, onError]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    cacheRef.current.delete(url); // Clear cache
    fetchData();
  }, [url, fetchData]);

  return { data, loading, error, refetch };
}

// Hook for batching multiple API calls
export function useBatchFetch<T extends Record<string, any>>(
  requests: Record<keyof T, string>,
  options: {
    enabled?: boolean;
    cacheTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { enabled = true, cacheTime = 5 * 60 * 1000, onSuccess, onError } = options;

  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  const fetchBatch = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const promises = Object.entries(requests).map(async ([key, url]) => {
        // Check cache first
        const cached = cacheRef.current.get(url);
        if (cached && Date.now() - cached.timestamp < cacheTime) {
          return [key, cached.data];
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Cache individual results
        cacheRef.current.set(url, { data: result, timestamp: Date.now() });

        return [key, result];
      });

      const results = await Promise.allSettled(promises);
      const batchData: Partial<T> = {};

      results.forEach((result, index) => {
        const key = Object.keys(requests)[index];
        if (result.status === 'fulfilled') {
          batchData[key as keyof T] = result.value[1];
        } else {
          console.error(`Failed to fetch ${key}:`, result.reason);
        }
      });

      setData(batchData);
      setLoading(false);
      onSuccess?.(batchData as T);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch fetch failed');
      setError(error);
      setLoading(false);
      onError?.(error);
    }
  }, [requests, enabled, cacheTime, onSuccess, onError]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const refetch = useCallback(() => {
    // Clear all cached requests
    Object.values(requests).forEach(url => cacheRef.current.delete(url));
    fetchBatch();
  }, [requests, fetchBatch]);

  return { data, loading, error, refetch };
}

// Hook for debounced search/filtering
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
