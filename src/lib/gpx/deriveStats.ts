import type { GpxDocument, GpxPoint, GpxStats, GpxTrackSegment } from './types';

const EARTH_RADIUS_METERS = 6_371_000;

export function deriveStats(document: GpxDocument): GpxStats {
  const trackSegments = document.tracks.flatMap((track) => track.segments);
  const trackPoints = trackSegments.flatMap((segment) => segment.points);
  const routePoints = document.routes.flatMap((route) => route.points);
  const trackElevationPoints = trackPoints.filter(hasElevation);

  const trackMeters = trackSegments.reduce((sum, segment) => sum + pathDistance(segment.points), 0);
  const routeMeters = document.routes.reduce((sum, route) => sum + pathDistance(route.points), 0);
  const times = trackPoints
    .map((point) => (point.time ? Date.parse(point.time) : Number.NaN))
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => a - b);

  return {
    trackDistance: toDistance(trackMeters),
    routeDistance: toDistance(routeMeters),
    time: {
      start: times[0] ? new Date(times[0]).toISOString() : undefined,
      end: times.length > 0 ? new Date(times[times.length - 1]).toISOString() : undefined,
      elapsedSeconds: times.length > 1 ? Math.max(0, Math.round((times[times.length - 1] - times[0]) / 1000)) : undefined,
    },
    elevation: trackElevationStats(trackElevationPoints, trackSegments),
    counts: {
      waypoints: document.waypoints.length,
      routes: document.routes.length,
      routePoints: routePoints.length,
      tracks: document.tracks.length,
      trackSegments: trackSegments.length,
      trackPoints: trackPoints.length,
    },
  };
}

function toDistance(meters: number) {
  return { meters, kilometers: meters / 1000 };
}

function trackElevationStats(points: Array<GpxPoint & { ele: number }>, segments: GpxTrackSegment[]) {
  if (points.length === 0) return {};

  let gain = 0;
  let loss = 0;
  for (const segment of segments) {
    const segmentPoints = segment.points.filter(hasElevation);
    for (let index = 1; index < segmentPoints.length; index += 1) {
      const current = segmentPoints[index];
      const previous = segmentPoints[index - 1];
      if (!current || !previous) continue;
      const delta = current.ele - previous.ele;
      if (delta > 0) gain += delta;
      if (delta < 0) loss += Math.abs(delta);
    }
  }

  return {
    min: Math.min(...points.map((point) => point.ele)),
    max: Math.max(...points.map((point) => point.ele)),
    gain,
    loss,
  };
}

function pathDistance(points: GpxPoint[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + haversineMeters(points[index], point), 0);
}

function haversineMeters(a: GpxPoint, b: GpxPoint): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function hasElevation<T extends GpxPoint>(point: T): point is T & { ele: number } {
  return typeof point.ele === 'number';
}
