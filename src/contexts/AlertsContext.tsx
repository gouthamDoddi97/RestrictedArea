import { createContext, useContext, type ReactNode } from 'react';
import {
  useWebSocketAlerts,
  type LiveAlert,
  type WsStatus,
} from '../hooks/useWebSocketAlerts';

type AlertsContextValue = {
  liveAlerts: LiveAlert[];
  wsStatus: WsStatus;
  wsUrl: string;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { alerts, status, url } = useWebSocketAlerts();
  return (
    <AlertsContext.Provider
      value={{ liveAlerts: alerts, wsStatus: status, wsUrl: url }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error('useAlerts must be used within AlertsProvider');
  }
  return ctx;
}
