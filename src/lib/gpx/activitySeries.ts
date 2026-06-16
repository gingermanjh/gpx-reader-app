import type { GpxDocument, GpxPoint } from './types';

const EARTH_RADIUS_METERS = 6_371_000;

export interface ActivitySample {
  id: string;
  trackId: string;
  trackName?: string;
  segmentId: string;
  segmentIndex: number;
  pointIndex: number;
  distanceMeters: number;
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  speedKph?: number;
}

export function buildActivitySeries(document: GpxDocument): ActivitySample[] {
  const samples: ActivitySample[] = [];
  let cumulativeMeters = 0;

  document.tracks.forEach((track) => {
    track.segments.forEach((segment, segmentIndex) => {
      segment.points.forEach((point, pointIndex) => {
        const previous = segment.points[pointIndex - 1];
        if (previous) {
          cumulativeMeters += haversineMeters(previous, point);
        }

        samples.push({
          id: point.id,
          trackId: track.id,
          trackName: track.name,
          segmentId: segment.id,
          segmentIndex,
          pointIndex,
          distanceMeters: cumulativeMeters,
          lat: point.lat,
          lon: point.lon,
          ele: point.ele,
          time: point.time,
          speedKph: previous ? speedKph(previous, point) : undefined,
        });
      });
    });
  });

  return samples;
}

function speedKph(previous: GpxPoint, current: GpxPoint): number | undefined {
  if (!previous.time || !current.time) return undefined;
  const elapsedSeconds = (Date.parse(current.time) - Date.parse(previous.time)) / 1000;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return undefined;
  return (haversineMeters(previous, current) / elapsedSeconds) * 3.6;
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
