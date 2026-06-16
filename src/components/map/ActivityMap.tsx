import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Direction, LatLngBoundsExpression, PointExpression } from 'leaflet';
import type { CourseAnalysis, GradeKind } from '../../lib/gpx/courseAnalysis';
import type { DistanceRange } from '../charts/ActivityCharts';
import type { GpxRenderModel, RenderBounds, RenderLatLng } from '../../lib/gpx/types';
import { MapLegend } from './MapLegend';

interface ActivityMapProps {
  model: GpxRenderModel;
  analysis?: CourseAnalysis;
  selectedRange?: DistanceRange;
}

export function ActivityMap({ model, analysis, selectedRange }: ActivityMapProps) {
  const [tileUnavailable, setTileUnavailable] = useState(false);
  const bounds = toLeafletBounds(model.bounds);
  const center = model.bounds
    ? ([(model.bounds.south + model.bounds.north) / 2, (model.bounds.west + model.bounds.east) / 2] as [number, number])
    : ([37.5665, 126.978] as [number, number]);

  return (
    <section className="map-card">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="activity-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setTileUnavailable(true) }}
        />
        <FitBounds bounds={bounds} />
        {model.trackSegments.map((segment, index) => (
          <Polyline
            key={segment.id}
            pathOptions={{ color: analysis ? '#94a3b8' : trackColor(index), weight: analysis ? 3 : 5, opacity: analysis ? 0.42 : 0.9 }}
            positions={segment.points.map((point) => [point.lat, point.lng])}
          >
            <Tooltip>
              {segment.trackName || segment.trackId} · segment {segment.segmentIndex + 1}
            </Tooltip>
          </Polyline>
        ))}
        {analysis?.legs.map((leg) => (
          <Polyline
            key={`grade-${leg.id}`}
            pathOptions={{ color: gradeColor(leg.gradeKind), weight: 7, opacity: 0.92 }}
            positions={[[leg.from.lat, leg.from.lon], [leg.to.lat, leg.to.lon]]}
          >
            <Tooltip>
              {gradeLabel(leg.gradeKind)} · {formatGrade(leg.gradePercent)} · {formatDistance(leg.startDistanceMeters)}–{formatDistance(leg.endDistanceMeters)}
            </Tooltip>
          </Polyline>
        ))}
        {selectedRange ? analysis?.legs.filter((leg) => overlapsRange(leg.startDistanceMeters, leg.endDistanceMeters, selectedRange)).map((leg) => (
          <Polyline
            key={`selected-${leg.id}`}
            pathOptions={{ color: '#facc15', weight: 12, opacity: 0.82 }}
            positions={[[leg.from.lat, leg.from.lon], [leg.to.lat, leg.to.lon]]}
          >
            <Tooltip>선택 구간 · {formatDistance(selectedRange.startDistanceMeters)}–{formatDistance(selectedRange.endDistanceMeters)}</Tooltip>
          </Polyline>
        )) : null}
        {model.routes.map((route) => (
          <Polyline
            key={route.id}
            pathOptions={{ color: '#7c3aed', weight: 3, dashArray: '8 8', opacity: 0.85 }}
            positions={route.points.map((point) => [point.lat, point.lng])}
          >
            <Tooltip>{route.name || route.id}</Tooltip>
          </Polyline>
        ))}
        {trackEndpoints(model).map((endpoint) => (
          <CircleMarker
            key={endpoint.id}
            center={[endpoint.position.lat, endpoint.position.lng]}
            radius={12}
            pathOptions={{ color: endpoint.kind === 'start' ? '#14532d' : '#7f1d1d', fillColor: endpoint.kind === 'start' ? '#22c55e' : '#ef4444', fillOpacity: 1, weight: 4 }}
          >
            <Tooltip
              permanent
              direction={trackTooltipDirection(endpoint.kind)}
              offset={trackTooltipOffset(endpoint.kind)}
              className={`endpoint-tooltip endpoint-tooltip--track endpoint-tooltip--track-${endpoint.kind}`}
            >
              {endpoint.label}
            </Tooltip>
          </CircleMarker>
        ))}
        {routeEndpoints(model).map((endpoint) => (
          <CircleMarker
            key={endpoint.id}
            center={[endpoint.position.lat, endpoint.position.lng]}
            radius={9}
            pathOptions={{ color: endpoint.kind === 'start' ? '#5b21b6' : '#9d174d', fillColor: endpoint.kind === 'start' ? '#8b5cf6' : '#ec4899', fillOpacity: 0.92, weight: 3 }}
          >
            <Tooltip permanent direction="bottom" offset={[0, 16]} className="endpoint-tooltip endpoint-tooltip--route">
              {endpoint.label}
            </Tooltip>
          </CircleMarker>
        ))}
        {model.waypoints.map((waypoint) => (
          <CircleMarker
            key={waypoint.id}
            center={[waypoint.position.lat, waypoint.position.lng]}
            radius={7}
            pathOptions={{ color: '#f97316', fillColor: '#fb923c', fillOpacity: 0.9 }}
          >
            <Tooltip>{waypoint.name || waypoint.id}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <MapLegend tileUnavailable={tileUnavailable} />
    </section>
  );
}

function FitBounds({ bounds }: { bounds?: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { paddingTopLeft: [96, 76], paddingBottomRight: [48, 48] });
  }, [bounds, map]);
  return null;
}

function toLeafletBounds(bounds?: RenderBounds): LatLngBoundsExpression | undefined {
  if (!bounds) return undefined;
  return [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  ];
}



function overlapsRange(start: number, end: number, range: DistanceRange): boolean {
  return end >= range.startDistanceMeters && start <= range.endDistanceMeters;
}

function gradeColor(kind: GradeKind): string {
  return {
    'steep-descent': '#1d4ed8',
    descent: '#38bdf8',
    flat: '#64748b',
    climb: '#f97316',
    'steep-climb': '#dc2626',
  }[kind];
}

function gradeLabel(kind: GradeKind): string {
  return {
    'steep-descent': '급내리막',
    descent: '내리막',
    flat: '평지',
    climb: '오르막',
    'steep-climb': '급오르막',
  }[kind];
}

function formatGrade(grade?: number): string {
  if (grade === undefined || !Number.isFinite(grade)) return 'grade N/A';
  return `${grade.toFixed(1)}%`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function trackColor(index: number): string {
  return ['#2563eb', '#0891b2', '#16a34a', '#dc2626'][index % 4];
}

interface EndpointMarker {
  id: string;
  kind: 'start' | 'finish';
  label: string;
  position: RenderLatLng;
}

function trackEndpoints(model: GpxRenderModel): EndpointMarker[] {
  const byTrack = new Map<string, typeof model.trackSegments>();
  for (const segment of model.trackSegments) {
    const segments = byTrack.get(segment.trackId) ?? [];
    segments.push(segment);
    byTrack.set(segment.trackId, segments);
  }

  return Array.from(byTrack.entries()).flatMap(([trackId, segments]) => {
    const ordered = [...segments].sort((a, b) => a.segmentIndex - b.segmentIndex);
    const first = ordered.find((segment) => segment.points.length > 0);
    const last = [...ordered].reverse().find((segment) => segment.points.length > 0);
    if (!first || !last) return [];
    const firstPoint = first.points[0];
    const lastPoint = last.points[last.points.length - 1];
    if (!firstPoint || !lastPoint) return [];
    return [
      { id: `${trackId}-track-start`, kind: 'start' as const, label: '트랙 시작', position: firstPoint },
      { id: `${trackId}-track-finish`, kind: 'finish' as const, label: '트랙 종료', position: lastPoint },
    ];
  });
}

function routeEndpoints(model: GpxRenderModel): EndpointMarker[] {
  return model.routes.flatMap((route) => {
    const first = route.points[0];
    const last = route.points[route.points.length - 1];
    if (!first || !last) return [];
    return [
      { id: `${route.id}-route-start`, kind: 'start' as const, label: '루트 시작', position: first },
      { id: `${route.id}-route-finish`, kind: 'finish' as const, label: '루트 종료', position: last },
    ];
  });
}

function trackTooltipDirection(kind: EndpointMarker['kind']): Direction {
  return kind === 'start' ? 'right' : 'top';
}

function trackTooltipOffset(kind: EndpointMarker['kind']): PointExpression {
  return kind === 'start' ? [18, 0] : [0, -16];
}
