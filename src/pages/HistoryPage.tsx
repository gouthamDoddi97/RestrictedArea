import { useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import type { AppOutletContext, Geofence, Vehicle } from '../types/app';

function tryShowPicker(input: HTMLInputElement) {
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch {
      /* already open or blocked */
    }
  }
  input.focus();
}

function onDateTimeFieldActivate(label: HTMLLabelElement) {
  const control = label.control;
  if (control instanceof HTMLInputElement) {
    tryShowPicker(control);
  }
}

type HistoryQuery = {
  vehicle_id: string;
  geofence_id: string;
  start_date: string;
  end_date: string;
  limit: number;
  offset: number;
};

export default function HistoryPage() {
  const { vehicles, geofences } = useOutletContext<AppOutletContext>();
  return <ViolationHistoryPanel vehicles={vehicles} geofences={geofences} />;
}

function ViolationHistoryPanel({
  vehicles,
  geofences,
}: {
  vehicles: Vehicle[];
  geofences: Geofence[];
}) {
  const [rows, setRows] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<HistoryQuery | null>(null);
  const [paging, setPaging] = useState(false);

  function buildParams(q: HistoryQuery): URLSearchParams {
    const params = new URLSearchParams();
    if (q.vehicle_id) params.set('vehicle_id', q.vehicle_id);
    if (q.geofence_id) params.set('geofence_id', q.geofence_id);
    params.set('limit', String(q.limit));
    if (q.offset > 0) params.set('offset', String(q.offset));
    if (q.start_date.trim()) {
      params.set('start_date', new Date(q.start_date).toISOString());
    }
    if (q.end_date.trim()) {
      params.set('end_date', new Date(q.end_date).toISOString());
    }
    return params;
  }

  async function runQuery(q: HistoryQuery) {
    const data = await api.listViolations(buildParams(q).toString());
    setRows(data.violations);
    setTotal(data.total_count);
    setQuery(q);
  }

  async function loadFromForm(fd: FormData) {
    const limitRaw = Number(fd.get('limit') ?? 50);
    let limit = Number.isFinite(limitRaw) ? limitRaw : 50;
    limit = Math.min(500, Math.max(1, limit));
    await runQuery({
      vehicle_id: String(fd.get('vehicle_id') ?? ''),
      geofence_id: String(fd.get('geofence_id') ?? ''),
      start_date: String(fd.get('start_date') ?? ''),
      end_date: String(fd.get('end_date') ?? ''),
      limit,
      offset: 0,
    });
  }

  const pageStart = query ? query.offset + 1 : 0;
  const pageEnd = query ? query.offset + rows.length : 0;
  const canPrev = query != null && query.offset > 0;
  const canNext = query != null && query.offset + rows.length < total;

  return (
    <div className="panel">
      <h3>Violation history</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await loadFromForm(new FormData(e.currentTarget));
          } catch (err) {
            toast.error(String(err));
          }
        }}
      >
        <select name="vehicle_id">
          <option value="">Any vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
        <select name="geofence_id">
          <option value="">Any geofence</option>
          {geofences.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <label
          className="datetime-field"
          onClick={(e) => onDateTimeFieldActivate(e.currentTarget)}
        >
          Start (optional)
          <input name="start_date" type="datetime-local" />
        </label>
        <label
          className="datetime-field"
          onClick={(e) => onDateTimeFieldActivate(e.currentTarget)}
        >
          End (optional)
          <input name="end_date" type="datetime-local" />
        </label>
        <input name="limit" type="number" defaultValue={50} min={1} max={500} />
        <button className="primary" type="submit">
          Load
        </button>
      </form>
      <p>
        Total: {total}
        {query && total > 0 && (
          <>
            {' '}
            · Showing {pageStart}–{pageEnd}
          </>
        )}
      </p>
      {query && total > 0 && (
        <div className="sim-pick-row">
          <button
            type="button"
            className="primary"
            style={{ background: '#64748b' }}
            disabled={!canPrev || paging}
            onClick={() => {
              void (async () => {
                setPaging(true);
                try {
                  await runQuery({
                    ...query,
                    offset: Math.max(0, query.offset - query.limit),
                  });
                } catch (err) {
                  toast.error(String(err));
                } finally {
                  setPaging(false);
                }
              })();
            }}
          >
            Previous
          </button>
          <button
            type="button"
            className="primary"
            disabled={!canNext || paging}
            onClick={() => {
              void (async () => {
                setPaging(true);
                try {
                  await runQuery({
                    ...query,
                    offset: query.offset + query.limit,
                  });
                } catch (err) {
                  toast.error(String(err));
                } finally {
                  setPaging(false);
                }
              })();
            }}
          >
            Next
          </button>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Vehicle</th>
            <th>Zone</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const row = r as Record<string, string>;
            return (
              <tr key={row.id}>
                <td>{row.event_type}</td>
                <td>{row.vehicle_number}</td>
                <td>{row.geofence_name}</td>
                <td>{row.timestamp}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
