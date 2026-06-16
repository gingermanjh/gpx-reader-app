export type GpxEntityKind = 'waypoint' | 'route' | 'track' | 'segment' | 'point';

export interface GpxDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
}

export interface GpxPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  name?: string;
  desc?: string;
}

export interface GpxWaypoint extends GpxPoint {
  id: string;
  kind: 'waypoint';
}

export interface GpxRoutePoint extends GpxPoint {
  id: string;
  kind: 'route-point';
}

export interface GpxTrackPoint extends GpxPoint {
  id: string;
  kind: 'track-point';
}

export interface GpxRoute {
  id: string;
  kind: 'route';
  name?: string;
  points: GpxRoutePoint[];
}

export interface GpxTrackSegment {
  id: string;
  kind: 'segment';
  points: GpxTrackPoint[];
}

export interface GpxTrack {
  id: string;
  kind: 'track';
  name?: string;
  segments: GpxTrackSegment[];
}

export interface GpxMetadata {
  name?: string;
  desc?: string;
  time?: string;
}

export interface GpxDocument {
  version?: string;
  creator?: string;
  metadata?: GpxMetadata;
  waypoints: GpxWaypoint[];
  routes: GpxRoute[];
  tracks: GpxTrack[];
  diagnostics: GpxDiagnostic[];
}

export type GpxParseResult =
  | { ok: true; document: GpxDocument; diagnostics: GpxDiagnostic[] }
  | { ok: false; diagnostics: GpxDiagnostic[] };

export interface DistanceStats {
  meters: number;
  kilometers: number;
}

export interface TimeStats {
  start?: string;
  end?: string;
  elapsedSeconds?: number;
}

export interface ElevationStats {
  min?: number;
  max?: number;
  gain?: number;
  loss?: number;
}

export interface GpxStats {
  trackDistance: DistanceStats;
  routeDistance: DistanceStats;
  time: TimeStats;
  elevation: ElevationStats;
  counts: {
    waypoints: number;
    routes: number;
    routePoints: number;
    tracks: number;
    trackSegments: number;
    trackPoints: number;
  };
}

export interface RenderLatLng {
  lat: number;
  lng: number;
}

export interface RenderTrackSegment {
  id: string;
  trackId: string;
  trackName?: string;
  segmentIndex: number;
  points: RenderLatLng[];
}

export interface RenderRoute {
  id: string;
  name?: string;
  points: RenderLatLng[];
}

export interface RenderWaypoint {
  id: string;
  name?: string;
  position: RenderLatLng;
}

export interface RenderBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface GpxRenderModel {
  trackSegments: RenderTrackSegment[];
  routes: RenderRoute[];
  waypoints: RenderWaypoint[];
  bounds?: RenderBounds;
  diagnostics: GpxDiagnostic[];
}
