import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import type { AppOutletContext } from '../types/app';

type VehicleLocationStatus = {
  latitude: number;
  longitude: number;
  timestamp: string;
  geofences: { name: string; category: string }[];
};

export default function VehiclesPage() {
  const { vehicles, loading, setLoading, refreshVehicles } =
    useOutletContext<AppOutletContext>();
  const [locations, setLocations] = useState<Record<string, VehicleLocationStatus | 'none' | 'loading'>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    const ids = vehicles.map((v) => v.id);
    setLocations((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (!(id in next)) next[id] = 'loading';
      }
      return next;
    });

    (async () => {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          try {
            const data = await api.getVehicleLocation(id);
            return {
              id,
              status: {
                latitude: data.current_location.latitude,
                longitude: data.current_location.longitude,
                timestamp: data.current_location.timestamp,
                geofences: data.current_geofences.map((g) => ({
                  name: g.geofence_name,
                  category: g.category,
                })),
              } satisfies VehicleLocationStatus,
            };
          } catch {
            return { id, status: 'none' as const };
          }
        }),
      );
      if (cancelled) return;
      setLocations((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.status === 'fulfilled') {
            next[r.value.id] = r.value.status;
          }
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [vehicles]);

  return (
    <div className="panel">
      <h3>Register vehicle</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setLoading(true);
          try {
            await api.createVehicle({
              vehicle_number: String(fd.get('vehicle_number') ?? ''),
              driver_name: String(fd.get('driver_name') ?? ''),
              vehicle_type: String(fd.get('vehicle_type') ?? ''),
              phone: String(fd.get('phone') ?? ''),
            });
            toast.success('Vehicle registered');
            form.reset();
            await refreshVehicles();
          } catch (err) {
            toast.error(String(err));
          } finally {
            setLoading(false);
          }
        }}
      >
        <input name="vehicle_number" placeholder="KA-01-AB-1234" required />
        <input name="driver_name" placeholder="Driver" required />
        <input name="vehicle_type" placeholder="truck" required />
        <input name="phone" placeholder="+1234567890" required />
        <button className="primary" type="submit" disabled={loading}>
          Register
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Driver</th>
            <th>Location</th>
            <th>Inside geofences</th>
            <th>ID</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const loc = locations[v.id];
            return (
              <tr key={v.id}>
                <td>{v.vehicle_number}</td>
                <td>{v.driver_name}</td>
                <td>
                  {(loc === undefined || loc === 'loading') && <span>Loading…</span>}
                  {loc === 'none' && <span>No location yet</span>}
                  {loc !== undefined && loc !== 'loading' && loc !== 'none' && (
                    <span>
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                      <br />
                      <small>{loc.timestamp}</small>
                    </span>
                  )}
                </td>
                <td>
                  {loc !== undefined && loc !== 'loading' && loc !== 'none' && (
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {loc.geofences.length === 0 && <li>—</li>}
                      {loc.geofences.map((g) => (
                        <li key={`${g.name}-${g.category}`}>
                          {g.name} ({g.category})
                        </li>
                      ))}
                    </ul>
                  )}
                  {(loc === undefined || loc === 'loading' || loc === 'none') && <span>—</span>}
                </td>
                <td>{v.id}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
