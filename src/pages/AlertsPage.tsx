import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { alertRuleClashMessage, alertRulesClash } from '../lib/alertRuleClash';
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

type FiredAlertRow = {
  event_id: string;
  event_type: string;
  vehicle_number: string;
  geofence_id: string;
  geofence_name: string;
  timestamp: string;
};

type AlertEventType = 'entry' | 'exit' | 'both';

const INITIAL_ALERT_FORM = {
  geofence_id: '',
  vehicle_id: '',
  event_type: 'entry' as AlertEventType,
};

export default function AlertsPage() {
  const { geofences, vehicles, loading, setLoading } = useOutletContext<AppOutletContext>();
  const [form, setForm] = useState(INITIAL_ALERT_FORM);
  const [rules, setRules] = useState<AlertRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fired, setFired] = useState<FiredAlertRow[]>([]);
  const [firedTotal, setFiredTotal] = useState(0);
  const [firedLoading, setFiredLoading] = useState(false);

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

  const refreshFired = useCallback(async () => {
    setFiredLoading(true);
    try {
      const data = await api.listAlertEvents('limit=50');
      setFired(data.events as FiredAlertRow[]);
      setFiredTotal(data.total_count);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setFiredLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRules().catch(() => {});
    refreshFired().catch(() => {});
  }, [refreshRules, refreshFired]);

  return (
    <div className="panel">
      <h3>Configure alert</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.geofence_id) {
            toast.error('Select a geofence');
            return;
          }
          const candidate = {
            vehicle_id: form.vehicle_id || null,
            event_type: form.event_type,
          };
          const onGeofence = rules.filter(
            (r) => r.geofence_id === form.geofence_id && r.status === 'active',
          );
          const conflicting = onGeofence.find((r) =>
            alertRulesClash(candidate, {
              vehicle_id: r.vehicle_id ?? null,
              event_type: r.event_type,
            }),
          );
          if (conflicting) {
            toast.error(alertRuleClashMessage(candidate, conflicting));
            return;
          }
          const payload = {
            geofence_id: form.geofence_id,
            event_type: form.event_type,
            ...(form.vehicle_id ? { vehicle_id: form.vehicle_id } : {}),
          };
          setLoading(true);
          try {
            await api.configureAlert(payload);
            toast.success('Alert configured');
            setForm(INITIAL_ALERT_FORM);
            await refreshRules();
          } catch (err) {
            toast.error(String(err));
          } finally {
            setLoading(false);
          }
        }}
      >
        <select
          name="geofence_id"
          required
          value={form.geofence_id}
          onChange={(e) => setForm((f) => ({ ...f, geofence_id: e.target.value }))}
        >
          <option value="">Geofence</option>
          {geofences.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          name="vehicle_id"
          value={form.vehicle_id}
          onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
        <select
          name="event_type"
          value={form.event_type}
          onChange={(e) =>
            setForm((f) => ({ ...f, event_type: e.target.value as AlertEventType }))
          }
        >
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

      <h3 style={{ marginTop: '1.25rem' }}>Fired alerts (history)</h3>
      <p className="sim-hint">
        Each row is a delivered alert event. Geofence comes from the stored alert record, not
        violation crossings that did not match a rule.
      </p>
      <p>
        <button
          type="button"
          className="primary"
          disabled={firedLoading}
          onClick={() => refreshFired()}
        >
          Refresh fired alerts
        </button>
      </p>
      <p>Total fired: {firedTotal}</p>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Vehicle</th>
            <th>Geofence</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {fired.length === 0 && !firedLoading && (
            <tr>
              <td colSpan={4}>No fired alerts yet.</td>
            </tr>
          )}
          {fired.map((e) => (
            <tr key={e.event_id}>
              <td>{e.event_type}</td>
              <td>{e.vehicle_number}</td>
              <td>
                {e.geofence_name} <small>({e.geofence_id})</small>
              </td>
              <td>{e.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
