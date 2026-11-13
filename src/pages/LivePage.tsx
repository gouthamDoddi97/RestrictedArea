import { useOutletContext } from 'react-router-dom';
import LiveSimulationPanel from '../components/LiveSimulationPanel';
import { useAlerts } from '../contexts/AlertsContext';
import { api } from '../api/client';
import type { AppOutletContext } from '../types/app';

export default function LivePage() {
  const { liveAlerts, wsStatus, wsUrl } = useAlerts();
  const {
    vehicles,
    geofences,
    refreshVehicles,
    simStart,
    simEnd,
    simPickMode,
    setSimPickMode,
    simRunning,
    startSim,
    stopSim,
  } = useOutletContext<AppOutletContext>();

  return (
    <LiveSimulationPanel
      vehicles={vehicles}
      liveAlerts={liveAlerts}
      wsStatus={wsStatus}
      wsUrl={wsUrl}
      simStart={simStart}
      simEnd={simEnd}
      pickMode={simPickMode}
      onPickModeChange={setSimPickMode}
      running={simRunning}
      onStart={async (count) => {
        if (!simStart || !simEnd) throw new Error('Set start and finish on the map');
        if (geofences.length > 0) {
          await api.ensureSimulationAlerts(geofences.map((g) => g.id));
        }
        const { vehicles: fleet } = await api.seedSimulationFleet(count);
        await refreshVehicles();
        startSim(
          fleet.map((v) => ({ id: v.id, vehicle_number: v.vehicle_number })),
          simStart,
          simEnd,
        );
      }}
      onStop={stopSim}
    />
  );
}
