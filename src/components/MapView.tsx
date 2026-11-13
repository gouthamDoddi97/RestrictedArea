import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Polyline,
  CircleMarker,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';

type Props = {
  polygons: { id: string; coords: LatLngTuple[]; color?: string; name?: string }[];
  marker?: LatLngTuple | null;
  onMapClick?: (lat: number, lng: number) => void;
  drawPoints?: LatLngTuple[];
  onResetDraw?: () => void;
  showResetDraw?: boolean;
  simStart?: LatLngTuple | null;
  simEnd?: LatLngTuple | null;
  simVehiclePositions?: { id: string; position: LatLngTuple }[];
};

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ResetDrawIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6v12a2 2 0 002 2h12M7 10l-3 3 3 3M20 6l-3 8-3-5-4 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MapView({
  polygons,
  marker,
  onMapClick,
  drawPoints,
  onResetDraw,
  showResetDraw,
  simStart,
  simEnd,
  simVehiclePositions,
}: Props) {
  const center: LatLngTuple =
    marker ?? simStart ?? simVehiclePositions?.[0]?.position ?? [37.7799, -122.4194];
  const canResetDraw = (drawPoints?.length ?? 0) > 0;

  return (
    <div className="map-wrap">
      {showResetDraw && (
        <button
          type="button"
          className={`map-reset-draw${canResetDraw ? '' : ' map-reset-draw--muted'}`}
          title="Clear draft polygon"
          aria-label="Clear draft polygon"
          disabled={!canResetDraw}
          onClick={() => onResetDraw?.()}
        >
          <ResetDrawIcon />
        </button>
      )}
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onMapClick={onMapClick} />
        {polygons.map((p) => (
          <Polygon key={p.id} positions={p.coords} pathOptions={{ color: p.color ?? '#0ea5e9' }}>
            {p.name ? (
              <Tooltip permanent direction="center" className="geofence-map-label">
                {p.name}
              </Tooltip>
            ) : null}
          </Polygon>
        ))}
        {drawPoints && drawPoints.length > 0 && (
          <Polygon positions={drawPoints} pathOptions={{ color: '#f59e0b', dashArray: '6' }} />
        )}
        {simStart && simEnd && (
          <Polyline
            positions={[simStart, simEnd]}
            pathOptions={{ color: '#a78bfa', weight: 3, dashArray: '8 8' }}
          />
        )}
        {simStart && (
          <CircleMarker
            center={simStart}
            radius={10}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.9 }}
          />
        )}
        {simEnd && (
          <CircleMarker
            center={simEnd}
            radius={10}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }}
          />
        )}
        {simVehiclePositions?.map((v) => (
          <CircleMarker
            key={v.id}
            center={v.position}
            radius={7}
            pathOptions={{ color: '#38bdf8', fillColor: '#0ea5e9', fillOpacity: 0.95 }}
          />
        ))}
        {marker && <Marker position={marker} />}
      </MapContainer>
    </div>
  );
}
