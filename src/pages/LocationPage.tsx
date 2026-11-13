import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import type { AppOutletContext } from '../types/app';

const SUCCESS_CLEAR_MS = 2500;

export default function LocationPage() {
  const { vehicles, marker, setMarker, loading, setLoading } =
    useOutletContext<AppOutletContext>();
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!submitStatus) return;
    const timer = setTimeout(() => setSubmitStatus(null), SUCCESS_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [submitStatus]);

  return (
    <div className="panel">
      <h3>Update location</h3>
      <p>Click the map to set lat/lng.</p>
      {submitStatus && (
        <p className="location-submit-status" role="status">
          {submitStatus}
          <button
            type="button"
            className="location-submit-status__dismiss"
            aria-label="Dismiss"
            onClick={() => setSubmitStatus(null)}
          >
            ×
          </button>
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (!marker) {
            toast.error('Click map for location');
            return;
          }
          setLoading(true);
          setSubmitStatus(null);
          try {
            await api.updateLocation({
              vehicle_id: fd.get('vehicle_id'),
              latitude: marker[0],
              longitude: marker[1],
              timestamp: new Date().toISOString(),
            });
            setMarker(null);
            setSubmitStatus('Location updated');
          } catch (err) {
            toast.error(String(err));
          } finally {
            setLoading(false);
          }
        }}
      >
        <select name="vehicle_id" required>
          <option value="">Select vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
        <button className="primary" type="submit" disabled={loading}>
          Submit location
        </button>
      </form>
    </div>
  );
}
