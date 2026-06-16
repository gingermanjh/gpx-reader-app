import type { GpxDocument, GpxPoint, GpxRenderModel, RenderBounds, RenderLatLng } from './types';

export function toRenderModel(document: GpxDocument): GpxRenderModel {
  const trackSegments = document.tracks.flatMap((track) =>
    track.segments.map((segment, segmentIndex) => ({
      id: segment.id,
      trackId: track.id,
      trackName: track.name,
      segmentIndex,
      points: segment.points.map(toLatLng),
    })),
  );

  const routes = document.routes.map((route) => ({
    id: route.id,
    name: route.name,
    points: route.points.map(toLatLng),
  }));

  const waypoints = document.waypoints.map((waypoint) => ({
    id: waypoint.id,
    name: waypoint.name,
    position: toLatLng(waypoint),
  }));

  const allPoints = [
    ...trackSegments.flatMap((segment) => segment.points),
    ...routes.flatMap((route) => route.points),
    ...waypoints.map((waypoint) => waypoint.position),
  ];

  return {
    trackSegments,
    routes,
    waypoints,
    bounds: boundsFor(allPoints),
    diagnostics: document.diagnostics,
  };
}

function toLatLng(point: GpxPoint): RenderLatLng {
  return { lat: point.lat, lng: point.lon };
}

function boundsFor(points: RenderLatLng[]): RenderBounds | undefined {
  if (points.length === 0) return undefined;
  return {
    south: Math.min(...points.map((point) => point.lat)),
    west: Math.min(...points.map((point) => point.lng)),
    north: Math.max(...points.map((point) => point.lat)),
    east: Math.max(...points.map((point) => point.lng)),
  };
}
