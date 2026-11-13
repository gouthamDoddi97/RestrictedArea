import { useState } from 'react';
import toast from 'react-hot-toast';
import type { LatLngTuple } from 'leaflet';
import type { LiveAlert, WsStatus } from '../hooks/useWebSocketAlerts';
import { haversineMeters } from '../lib/simulation';

type Vehicle = { id: string; vehicle_number: string; driver_name: string };

type Props = {
  vehicles: Vehicle[];
  liveAlerts: LiveAlert[];
  simStart: LatLngTuple | null;
  simEnd: LatLngTuple | null;
  onPickModeChange: (mode: 'start' | 'end' | null) => void;
  pickMode: 'start' | 'end' | null;
  running: boolean;
  onStart: (count: number) => void | Promise<void>;
  onStop: () => void;
  wsStatus: WsStatus;
  wsUrl: string;
};

export default function LiveSimulationPanel({
  vehicles,
  liveAlerts,
  simStart,
  simEnd,
  onPickModeChange,
  pickMode,
  running,
  onStart,
  onStop,
  wsStatus,
  wsUrl,
}: Props) {
  const [count, setCount] = useState(1);
  const locationsReady = Boolean(simStart && simEnd);
  const routeReady = locationsReady && haversineMeters(simStart!, simEnd!) > 5;
  const maxSim = 50;
  const stopMuted = !locationsReady || !running;

  return (
    <>
      <div className="panel">
        <h3>Route simulation</h3>
        <p>
          Set start and finish on the map, choose how many vehicles to move, then run. Missing
          vehicles are created as <strong>SIM-*</strong> dummies in one DB transaction. Each gets a
          random speed (~30–90 km/h). Ensures alert rules (all vehicles, entry+exit) for each
          geofence and clears stale zone state before moving.
        </p>
        <label>
          Vehicles to simulate (1–{maxSim})
          <input
            type="number"
            min={1}
            max={maxSim}
            value={count}
            disabled={running}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <p className="sim-hint">
          Registered now: {vehicles.length} (simulation reuses these first, then creates SIM vehicles).
        </p>
        {pickMode && !running && (
          <p className="sim-hint">Click the map to place the {pickMode} point.</p>
        )}
        <div className="sim-pick-row">
          <button
            type="button"
            className={`primary sim-set-point sim-set-point--start${pickMode === 'start' ? ' is-picking' : ''}`}
            disabled={running}
            onClick={() => onPickModeChange(pickMode === 'start' ? null : 'start')}
          >
            Set start
          </button>
          <button
            type="button"
            className={`primary sim-set-point sim-set-point--finish${pickMode === 'end' ? ' is-picking' : ''}`}
            disabled={running}
            onClick={() => onPickModeChange(pickMode === 'end' ? null : 'end')}
          >
            Set finish
          </button>
        </div>
        <p className="sim-hint">
          Start: {simStart ? `${simStart[0].toFixed(4)}, ${simStart[1].toFixed(4)}` : '—'} · Finish:{' '}
          {simEnd ? `${simEnd[0].toFixed(4)}, ${simEnd[1].toFixed(4)}` : '—'}
          {simStart && simEnd && (
            <> · {haversineMeters(simStart, simEnd).toFixed(0)} m</>
          )}
        </p>
        <div className="sim-pick-row">
          <button
            type="button"
            className={`primary${!locationsReady ? ' sim-btn-muted' : ''}`}
            disabled={running || !routeReady}
            onClick={() => {
              void (async () => {
                try {
                  await onStart(count);
                  toast.success('Simulation started');
                  onPickModeChange(null);
                } catch (e) {
                  toast.error(String(e));
                }
              })();
            }}
          >
            Simulate
          </button>
          <button
            type="button"
            className={`primary${stopMuted ? ' sim-btn-muted' : ''}`}
            disabled={!running || !locationsReady}
            onClick={() => {
              onStop();
              toast.success('Simulation stopped');
            }}
          >
            Stop
          </button>
        </div>
      </div>
      <div className="panel">
        <h3>Live alerts</h3>
        <p className="sim-hint">
          WebSocket: <strong>{wsStatus}</strong> — <code>{wsUrl}</code>
        </p>
        <p className="sim-hint">
          DevTools → Network → filter <strong>WS</strong> (or type <code>ws/alerts</code>). The
          socket opens when this app loads, not only during simulation.
        </p>
        {wsStatus !== 'open' && (
          <p className="sim-hint">If status stays closed/error, confirm the API is on port 3000.</p>
        )}
        {liveAlerts.length === 0 && wsStatus === 'open' && (
          <p className="sim-hint">Connected — waiting for entry/exit events (needs geofence crossing).</p>
        )}
        {liveAlerts.map((a) => (
          <div key={a.event_id} className="alert-item">
            {a.event_type} — {a.vehicle.vehicle_number} — {a.geofence.geofence_name} @ {a.timestamp}
          </div>
        ))}
      </div>
    </>
  );
}
