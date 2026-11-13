import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { wsAlertsUrl } from '../api/client';

export interface LiveAlert {
  event_id: string;
  event_type: string;
  timestamp: string;
  vehicle: { vehicle_number: string; driver_name: string };
  geofence: { geofence_name: string; category: string };
  location: { latitude: number; longitude: number };
}

export type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

export function useWebSocketAlerts() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [status, setStatus] = useState<WsStatus>('connecting');
  const url = wsAlertsUrl();

  useEffect(() => {
    let ws: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      setStatus('connecting');
      ws = new WebSocket(url);
      ws.onopen = () => {
        if (!stopped) setStatus('open');
      };
      ws.onerror = () => {
        if (!stopped) setStatus('error');
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as LiveAlert;
        setAlerts((prev) => {
          if (prev.some((a) => a.event_id === msg.event_id)) return prev;
          return [msg, ...prev].slice(0, 100);
        });
        toast(
          `${msg.event_type.toUpperCase()}: ${msg.vehicle.vehicle_number} @ ${msg.geofence.geofence_name}`,
        );
      };
      ws.onclose = () => {
        if (stopped) return;
        setStatus('closed');
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [url]);

  return { alerts, status, url };
}
