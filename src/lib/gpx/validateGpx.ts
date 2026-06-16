import type { GpxDiagnostic, GpxDocument } from './types';

export function validateGpx(document: GpxDocument): GpxDiagnostic[] {
  const diagnostics: GpxDiagnostic[] = [];

  if (document.version && document.version !== '1.1') {
    diagnostics.push({
      severity: 'warning',
      code: 'unsupported-version',
      message: `GPX ${document.version} 파일입니다. 앱은 GPX 1.1 중심으로 검증합니다.`,
    });
  }

  const routePoints = document.routes.reduce((count, route) => count + route.points.length, 0);
  const trackPoints = document.tracks.reduce(
    (count, track) => count + track.segments.reduce((segmentCount, segment) => segmentCount + segment.points.length, 0),
    0,
  );

  if (document.waypoints.length + routePoints + trackPoints === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'no-renderable-geometry',
      message: '렌더링할 waypoint, route point, track point가 없습니다.',
    });
  }

  document.routes.forEach((route, index) => {
    if (route.points.length === 0) {
      diagnostics.push({
        severity: 'warning',
        code: 'empty-route',
        message: 'route에 rtept가 없습니다.',
        path: `rte[${index}]`,
      });
    }
  });

  document.tracks.forEach((track, trackIndex) => {
    if (track.segments.length === 0) {
      diagnostics.push({
        severity: 'warning',
        code: 'empty-track',
        message: 'track에 trkseg가 없습니다.',
        path: `trk[${trackIndex}]`,
      });
    }

    track.segments.forEach((segment, segmentIndex) => {
      if (segment.points.length === 0) {
        diagnostics.push({
          severity: 'warning',
          code: 'empty-track-segment',
          message: 'track segment에 trkpt가 없습니다.',
          path: `trk[${trackIndex}].trkseg[${segmentIndex}]`,
        });
      }
    });
  });

  return diagnostics;
}
