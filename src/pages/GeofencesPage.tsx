import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import type { LatLngTuple } from 'leaflet';
import { api } from '../api/client';
import type { AppOutletContext } from '../types/app';

export default function GeofencesPage() {
  const {
    geofences,
    categoryFilter,
    setCategoryFilter,
    drawPoints,
    setDrawPoints,
    loading,
    setLoading,
    refreshGeofences,
  } = useOutletContext<AppOutletContext>();

  async function submitGeofence(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const coords =
      drawPoints.length >= 3
        ? [...drawPoints, drawPoints[0]]
        : ([
            [37.7749, -122.4194],
            [37.7849, -122.4194],
            [37.7849, -122.4094],
            [37.7749, -122.4094],
            [37.7749, -122.4194],
          ] as LatLngTuple[]);
    setLoading(true);
    try {
      await api.createGeofence({
        name: fd.get('name'),
        description: fd.get('description'),
        category: fd.get('category'),
        coordinates: coords,
      });
      toast.success('Geofence created');
      setDrawPoints([]);
      await refreshGeofences();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h3>Create geofence</h3>
      <p>Click map to add polygon vertices (closes automatically on submit).</p>
      <p>
        Draft vertices: <strong>{drawPoints.length}</strong>
        {drawPoints.length > 0 && drawPoints.length < 3 && (
          <span> — add at least 3 points, or reset and try again.</span>
        )}
      </p>
      <form onSubmit={submitGeofence}>
        <input name="name" placeholder="Name" required />
        <textarea name="description" placeholder="Description" rows={2} />
        <select name="category" defaultValue="restricted_zone">
          <option value="delivery_zone">delivery_zone</option>
          <option value="restricted_zone">restricted_zone</option>
          <option value="toll_zone">toll_zone</option>
          <option value="customer_area">customer_area</option>
        </select>
        <button className="primary" type="submit" disabled={loading}>
          Create
        </button>
      </form>
      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
        <option value="">All categories</option>
        <option value="restricted_zone">restricted_zone</option>
        <option value="delivery_zone">delivery_zone</option>
      </select>
      <ul>
        {geofences.map((g) => (
          <li key={g.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>
              {g.name} ({g.category})
              {g.vehicles_inside_count > 0 && (
                <> — <strong>{g.vehicles_inside_count}</strong> inside</>
              )}{' '}
              — <small>{g.id}</small>
            </span>
            <button
              type="button"
              className="primary"
              style={{ background: '#ef4444', width: 'auto', marginLeft: 'auto' }}
              disabled={loading}
              onClick={async () => {
                const cascadeMessage =
                  `Delete geofence "${g.name}"?\n\nThis will permanently remove this zone and cascade-delete related vehicle geofence state, violation history, and alert rules for this geofence. This cannot be undone.`;
                if (g.vehicles_inside_count > 0 && !window.confirm(cascadeMessage)) {
                  return;
                }
                setLoading(true);
                try {
                  await api.deleteGeofence(g.id);
                  toast.success('Geofence deleted');
                  await refreshGeofences();
                } catch (err) {
                  toast.error(String(err));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
