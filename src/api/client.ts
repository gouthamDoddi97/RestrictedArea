const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }
  return data as T;
}

export const api = {
  createGeofence: (body: unknown) =>
    request('/geofences', { method: 'POST', body: JSON.stringify(body) }),

  listGeofences: (category?: string) =>
    request<{ geofences: unknown[] }>(
      `/geofences${category ? `?category=${encodeURIComponent(category)}` : ''}`,
    ),

  deleteGeofence: (id: string) =>
    request<{ id: string; status: string }>(`/geofences/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createVehicle: (body: unknown) =>
    request('/vehicles', { method: 'POST', body: JSON.stringify(body) }),

  seedSimulationFleet: (count: number) =>
    request<{ vehicles: { id: string; vehicle_number: string; driver_name: string }[] }>(
      '/vehicles/simulation-fleet',
      { method: 'POST', body: JSON.stringify({ count }) },
    ),

  listVehicles: () => request<{ vehicles: unknown[] }>('/vehicles'),

  getVehicleLocation: (vehicleId: string) =>
    request<{
      vehicle_id: string;
      vehicle_number: string;
      current_location: {
        latitude: number;
        longitude: number;
        timestamp: string;
      };
      current_geofences: {
        geofence_id: string;
        geofence_name: string;
        category: string;
      }[];
    }>(`/vehicles/location/${encodeURIComponent(vehicleId)}`),

  updateLocation: (body: unknown) =>
    request('/vehicles/location', { method: 'POST', body: JSON.stringify(body) }),

  configureAlert: (body: unknown) =>
    request('/alerts/configure', { method: 'POST', body: JSON.stringify(body) }),

  ensureSimulationAlerts: (geofence_ids: string[]) =>
    request('/alerts/ensure-simulation', {
      method: 'POST',
      body: JSON.stringify({ geofence_ids }),
    }),

  listAlerts: () => request<{ alerts: unknown[] }>('/alerts'),

  deleteAlert: (alertId: string) =>
    request<{ alert_id: string; status: string }>(
      `/alerts/${encodeURIComponent(alertId)}`,
      { method: 'DELETE' },
    ),

  listViolations: (qs: string) =>
    request<{ violations: unknown[]; total_count: number }>(`/violations/history?${qs}`),
};

export function wsAlertsUrl(): string {
  const base = import.meta.env.VITE_WS_URL ?? API_URL.replace(/^http/, 'ws');
  return `${base}/ws/alerts`;
}
