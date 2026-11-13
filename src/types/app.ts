import type { Dispatch, SetStateAction } from 'react';
import type { LatLngTuple } from 'leaflet';

export type Geofence = {
  id: string;
  name: string;
  category: string;
  coordinates: LatLngTuple[];
  vehicles_inside_count: number;
};

export type Vehicle = {
  id: string;
  vehicle_number: string;
  driver_name: string;
};

export type AppOutletContext = {
  geofences: Geofence[];
  vehicles: Vehicle[];
  refreshGeofences: () => Promise<void>;
  refreshVehicles: () => Promise<void>;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  drawPoints: LatLngTuple[];
  setDrawPoints: Dispatch<SetStateAction<LatLngTuple[]>>;
  marker: LatLngTuple | null;
  setMarker: Dispatch<SetStateAction<LatLngTuple | null>>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  simStart: LatLngTuple | null;
  setSimStart: Dispatch<SetStateAction<LatLngTuple | null>>;
  simEnd: LatLngTuple | null;
  setSimEnd: Dispatch<SetStateAction<LatLngTuple | null>>;
  simPickMode: 'start' | 'end' | null;
  setSimPickMode: Dispatch<SetStateAction<'start' | 'end' | null>>;
  simRunning: boolean;
  startSim: (
    fleet: { id: string; vehicle_number: string }[],
    start: LatLngTuple,
    end: LatLngTuple,
  ) => void;
  stopSim: () => void;
};
