'use client';

// ═══════════════════════════════════════════════════════════════
// useLiveStats — polls the observability endpoints every 30s.
//
// One poller, owned by the Landing #metrics section, that fans its data
// out to the KPI cards, the requests timeseries chart, and the intent
// donut. `isLive` is false whenever any source fell back to mock data, so
// the UI can show a "demo mode" badge instead of "live". 30s respects the
// backend's 60/min stats rate limit (shared across visitors via the proxy).
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getIntentDistribution,
  getStats,
  getStatsTimeseries,
} from '@/lib/api-client';
import type { IntentCount, StatsSnapshot, StatsTimeseriesPoint } from '@/lib/types';

const POLL_MS = 30_000;

export interface LiveStats {
  readonly stats: StatsSnapshot | null;
  readonly timeseries: StatsTimeseriesPoint[];
  readonly intents: IntentCount[];
  readonly isLive: boolean;
  readonly lastUpdated: number | null;
}

const EMPTY: LiveStats = {
  stats: null,
  timeseries: [],
  intents: [],
  isLive: false,
  lastUpdated: null,
};

export function useLiveStats(): LiveStats {
  const [state, setState] = useState<LiveStats>(EMPTY);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const [s, ts, it] = await Promise.all([
      getStats(),
      getStatsTimeseries(),
      getIntentDistribution(),
    ]);
    if (!mounted.current) return;
    setState({
      stats: s.data,
      timeseries: ts.data,
      intents: it.data,
      isLive: s.live && ts.live && it.live,
      lastUpdated: Date.now(),
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Kick the first poll off a timer (not the synchronous effect body) and
    // then poll on an interval — both setState from a deferred callback.
    const kick = setTimeout(() => void refresh(), 0);
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => {
      mounted.current = false;
      clearTimeout(kick);
      clearInterval(id);
    };
  }, [refresh]);

  return state;
}
