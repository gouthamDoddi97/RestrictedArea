import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLngTuple } from 'leaflet';
import { api } from '../api/client';
import {
  haversineMeters,
  positionAlongRoute,
  randomSpeedMps,
} from '../lib/simulation';

export type SimVehicle = { id: string; vehicle_number: string };

type Runner = {
  vehicleId: string;
  progress: number;
  speedMps: number;
  finished: boolean;
};

const TICK_MS = 1000;

export function useVehicleSimulation() {
  const [running, setRunning] = useState(false);
  const [positions, setPositions] = useState<Record<string, LatLngTuple>>({});
  const runnersRef = useRef<Runner[]>([]);
  const routeRef = useRef<{ start: LatLngTuple; end: LatLngTuple; distanceM: number } | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickInFlightRef = useRef(false);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    runnersRef.current = [];
    routeRef.current = null;
    tickInFlightRef.current = false;
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(async () => {
    if (tickInFlightRef.current) return;
    const route = routeRef.current;
    const runners = runnersRef.current;
    if (!route || runners.length === 0) return;

    tickInFlightRef.current = true;
    try {
      const nextPositions: Record<string, LatLngTuple> = {};
      const updates: { vehicleId: string; pos: LatLngTuple }[] = [];
      let active = 0;

      for (const r of runners) {
        if (r.finished) continue;
        active++;
        const step = (r.speedMps * TICK_MS) / 1000 / route.distanceM;
        r.progress = Math.min(1, r.progress + step);
        const pos = positionAlongRoute(route.start, route.end, r.progress);
        nextPositions[r.vehicleId] = pos;
        updates.push({ vehicleId: r.vehicleId, pos });
        if (r.progress >= 1) r.finished = true;
      }

      const ts = new Date().toISOString();
      await Promise.all(
        updates.map(({ vehicleId, pos }) =>
          api
            .updateLocation({
              vehicle_id: vehicleId,
              latitude: pos[0],
              longitude: pos[1],
              timestamp: ts,
            })
            .catch(() => undefined),
        ),
      );

      setPositions((prev) => ({ ...prev, ...nextPositions }));
      if (active === 0) stop();
    } finally {
      tickInFlightRef.current = false;
    }
  }, [stop]);

  const start = useCallback(
    (fleet: SimVehicle[], start: LatLngTuple, end: LatLngTuple) => {
      stop();
      if (fleet.length < 1) {
        throw new Error('No vehicles in simulation fleet');
      }
      const distanceM = Math.max(1, haversineMeters(start, end));
      routeRef.current = { start, end, distanceM };
      runnersRef.current = fleet.map((v) => ({
        vehicleId: v.id,
        progress: 0,
        speedMps: randomSpeedMps(),
        finished: false,
      }));
      const initial: Record<string, LatLngTuple> = {};
      for (const r of runnersRef.current) {
        initial[r.vehicleId] = start;
      }
      setPositions(initial);
      setRunning(true);
      void tick();
      timerRef.current = setInterval(() => {
        void tick();
      }, TICK_MS);
    },
    [stop, tick],
  );

  return { running, positions, start, stop };
}
