import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import type { AppOutletContext } from '../types/app';

type AlertRuleRow = {
  alert_id: string;
  geofence_id: string;
  geofence_name: string;
  vehicle_id?: string;
  vehicle_number?: string;
  event_type: string;
  status: string;
  created_at: string;
};

export default function AlertsPage() {
  const { geofences, vehicles, loading, setLoading } = useOutletContext<AppOutletContext>();
  const [rules, setRules] = useState<AlertRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const data = await api.listAlerts();
      setRules(data.alerts as AlertRuleRow[]);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRules().catch(() => {});
  }, [refreshRules]);

  return (
    <div className="panel">
      <h3>Configure alert</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const vehicleId = String(fd.get('vehicle_id') || '');
          setLoading(true);
          try {
            await api.configureAlert({
              geofence_id: fd.get('geofence_id'),
              event_type: fd.get('event_type'),
              ...(vehicleId ? { vehicle_id: vehicleId } : {}),
            });
            toast.success('Alert configured');
            await refreshRules();
          } catch (err) {
            toast.error(String(err));
          } finally {
            setLoading(false);
          }
        }}
      >
        <select name="geofence_id" required>
          <option value="">Geofence</option>
          {geofences.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select name="vehicle_id">
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
        <select name="event_type" defaultValue="entry">
          <option value="entry">entry</option>
          <option value="exit">exit</option>
          <option value="both">both</option>
        </select>
        <button className="primary" type="submit" disabled={loading}>
          Save rule
        </button>
      </form>

      <h3 style={{ marginTop: '1.25rem' }}>Configured rules</h3>
      <p>
        <button type="button" className="primary" disabled={rulesLoading} onClick={() => refreshRules()}>
          Refresh list
        </button>
      </p>
      <table>
        <thead>
          <tr>
            <th>Geofence</th>
            <th>Vehicle</th>
            <th>Event</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 && !rulesLoading && (
            <tr>
              <td colSpan={5}>No alert rules yet.</td>
            </tr>
          )}
          {rules.map((r) => (
            <tr key={r.alert_id}>
              <td>
                {r.geofence_name} <small>({r.geofence_id})</small>
              </td>
              <td>{r.vehicle_number ?? 'All vehicles'}</td>
              <td>{r.event_type}</td>
              <td>{r.status}</td>
              <td>
                <button
                  type="button"
                  disabled={deletingId === r.alert_id}
                  onClick={() => {
                    const msg =
                      `Delete alert rule for "${r.geofence_name}"` +
                      ` (${r.vehicle_number ?? 'all vehicles'}, ${r.event_type})?`;
                    if (!window.confirm(msg)) return;
                    void (async () => {
                      setDeletingId(r.alert_id);
                      try {
                        await api.deleteAlert(r.alert_id);
                        toast.success('Alert rule deleted');
                        await refreshRules();
                      } catch (err) {
                        toast.error(String(err));
                      } finally {
                        setDeletingId(null);
                      }
                    })();
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
