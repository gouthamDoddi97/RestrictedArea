import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import MapView from './components/MapView';
import { api } from './api/client';
import { useVehicleSimulation } from './hooks/useVehicleSimulation';
import type { AppOutletContext, Geofence, Vehicle } from './types/app';
import type { LatLngTuple } from 'leaflet';
import GeofencesPage from './pages/GeofencesPage';
import VehiclesPage from './pages/VehiclesPage';
import LocationPage from './pages/LocationPage';
import AlertsPage from './pages/AlertsPage';
import HistoryPage from './pages/HistoryPage';
import LivePage from './pages/LivePage';

const NAV: { to: string; label: string }[] = [
  { to: '/geofences', label: 'Geofences' },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/location', label: 'Location' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/history', label: 'History' },
  { to: '/live', label: 'Live feed' },
];

function AppLayout() {
  const { pathname } = useLocation();
  const isGeofences = pathname === '/geofences';
  const isLocation = pathname === '/location';
  const isLive = pathname === '/live';

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [drawPoints, setDrawPoints] = useState<LatLngTuple[]>([]);
  const [marker, setMarker] = useState<LatLngTuple | null>(null);
  const [loading, setLoading] = useState(false);
  const [simStart, setSimStart] = useState<LatLngTuple | null>(null);
  const [simEnd, setSimEnd] = useState<LatLngTuple | null>(null);
  const [simPickMode, setSimPickMode] = useState<'start' | 'end' | null>(null);
  const {
    running: simRunning,
    positions: simPositions,
    start: startSim,
    stop: stopSim,
  } = useVehicleSimulation();

  const refreshGeofences = useCallback(async () => {
    const data = await api.listGeofences(categoryFilter || undefined);
    setGeofences(data.geofences as Geofence[]);
  }, [categoryFilter]);

  const refreshVehicles = useCallback(async () => {
    const data = await api.listVehicles();
    setVehicles(data.vehicles as Vehicle[]);
  }, []);

  useEffect(() => {
    refreshGeofences().catch((e) => toast.error(String(e)));
    refreshVehicles().catch((e) => toast.error(String(e)));
  }, [refreshGeofences, refreshVehicles]);

  useEffect(() => {
    if (!isLive) {
      stopSim();
      setSimPickMode(null);
    }
  }, [isLive, stopSim]);

  const simVehicleMarkers = useMemo(
    () =>
      Object.entries(simPositions).map(([id, position]) => ({
        id,
        position,
      })),
    [simPositions],
  );

  const polygons = geofences.map((g) => ({
    id: g.id,
    coords: g.coordinates,
    color: g.category === 'restricted_zone' ? '#ef4444' : '#0ea5e9',
    name: g.name,
  }));

  const outletContext: AppOutletContext = {
    geofences,
    vehicles,
    refreshGeofences,
    refreshVehicles,
    categoryFilter,
    setCategoryFilter,
    drawPoints,
    setDrawPoints,
    marker,
    setMarker,
    loading,
    setLoading,
    simStart,
    setSimStart,
    simEnd,
    setSimEnd,
    simPickMode,
    setSimPickMode,
    simRunning,
    startSim,
    stopSim,
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Geofence</h2>
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="main">
        <MapView
          polygons={polygons}
          marker={marker}
          drawPoints={isGeofences ? drawPoints : undefined}
          showResetDraw={isGeofences}
          onResetDraw={() => {
            setDrawPoints([]);
            toast.success('Draft polygon cleared');
          }}
          simStart={isLive ? simStart : null}
          simEnd={isLive ? simEnd : null}
          simVehiclePositions={
            isLive && simVehicleMarkers.length > 0 ? simVehicleMarkers : undefined
          }
          onMapClick={(lat, lng) => {
            if (isGeofences) setDrawPoints((p) => [...p, [lat, lng]]);
            if (isLocation) setMarker([lat, lng]);
            if (isLive && simPickMode === 'start') setSimStart([lat, lng]);
            if (isLive && simPickMode === 'end') setSimEnd([lat, lng]);
          }}
        />
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/geofences" replace />} />
        <Route path="geofences" element={<GeofencesPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="location" element={<LocationPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="live" element={<LivePage />} />
      </Route>
    </Routes>
  );
}
