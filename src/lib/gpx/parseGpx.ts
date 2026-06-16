import type {
  GpxDiagnostic,
  GpxDocument,
  GpxMetadata,
  GpxParseResult,
  GpxPoint,
  GpxRoute,
  GpxRoutePoint,
  GpxTrack,
  GpxTrackPoint,
  GpxTrackSegment,
  GpxWaypoint,
} from './types';
import { validateGpx } from './validateGpx';

const XML_PARSER_ERROR = 'parsererror';

export function parseGpx(xmlText: string): GpxParseResult {
  const diagnostics: GpxDiagnostic[] = [];
  const trimmed = xmlText.trim();

  if (!trimmed) {
    return {
      ok: false,
      diagnostics: [{ severity: 'error', code: 'empty-input', message: 'GPX 내용이 비어 있습니다.' }],
    };
  }

  const xml = new DOMParser().parseFromString(trimmed, 'application/xml');
  const parserError = xml.getElementsByTagName(XML_PARSER_ERROR)[0];
  if (parserError) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'malformed-xml',
          message: parserError.textContent?.trim() || 'XML 문법이 올바르지 않습니다.',
        },
      ],
    };
  }

  const root = xml.documentElement;
  if (!root || root.localName !== 'gpx') {
    return {
      ok: false,
      diagnostics: [
        { severity: 'error', code: 'invalid-root', message: '루트 요소가 <gpx>가 아닙니다.' },
      ],
    };
  }

  const document: GpxDocument = {
    version: root.getAttribute('version') ?? undefined,
    creator: root.getAttribute('creator') ?? undefined,
    metadata: parseMetadata(firstChild(root, 'metadata')),
    waypoints: directChildren(root, 'wpt')
      .map((element, index) => parsePoint(element, `wpt[${index}]`, diagnostics))
      .filter((point): point is GpxPoint => point !== null)
      .map((point, index): GpxWaypoint => ({ ...point, id: `wpt-${index}`, kind: 'waypoint' })),
    routes: directChildren(root, 'rte').map((element, routeIndex) => parseRoute(element, routeIndex, diagnostics)),
    tracks: directChildren(root, 'trk').map((element, trackIndex) => parseTrack(element, trackIndex, diagnostics)),
    diagnostics,
  };

  const validationDiagnostics = validateGpx(document);
  const allDiagnostics = [...diagnostics, ...validationDiagnostics];
  document.diagnostics = allDiagnostics;

  const hasFatal = allDiagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (hasFatal && !hasRenderableGeometry(document)) {
    return { ok: false, diagnostics: allDiagnostics };
  }

  return { ok: true, document, diagnostics: allDiagnostics };
}

function parseMetadata(element?: Element): GpxMetadata | undefined {
  if (!element) return undefined;
  return {
    name: textOf(element, 'name'),
    desc: textOf(element, 'desc'),
    time: textOf(element, 'time'),
  };
}

function parseRoute(element: Element, routeIndex: number, diagnostics: GpxDiagnostic[]): GpxRoute {
  const points = directChildren(element, 'rtept')
    .map((pointElement, pointIndex) => parsePoint(pointElement, `rte[${routeIndex}].rtept[${pointIndex}]`, diagnostics))
    .filter((point): point is GpxPoint => point !== null)
    .map(
      (point, pointIndex): GpxRoutePoint => ({
        ...point,
        id: `rte-${routeIndex}-pt-${pointIndex}`,
        kind: 'route-point',
      }),
    );

  return {
    id: `rte-${routeIndex}`,
    kind: 'route',
    name: textOf(element, 'name'),
    points,
  };
}

function parseTrack(element: Element, trackIndex: number, diagnostics: GpxDiagnostic[]): GpxTrack {
  const segments = directChildren(element, 'trkseg').map((segmentElement, segmentIndex) => {
    const points = directChildren(segmentElement, 'trkpt')
      .map((pointElement, pointIndex) =>
        parsePoint(pointElement, `trk[${trackIndex}].trkseg[${segmentIndex}].trkpt[${pointIndex}]`, diagnostics),
      )
      .filter((point): point is GpxPoint => point !== null)
      .map(
        (point, pointIndex): GpxTrackPoint => ({
          ...point,
          id: `trk-${trackIndex}-seg-${segmentIndex}-pt-${pointIndex}`,
          kind: 'track-point',
        }),
      );

    return {
      id: `trk-${trackIndex}-seg-${segmentIndex}`,
      kind: 'segment',
      points,
    } satisfies GpxTrackSegment;
  });

  return {
    id: `trk-${trackIndex}`,
    kind: 'track',
    name: textOf(element, 'name'),
    segments,
  };
}

function parsePoint(element: Element, path: string, diagnostics: GpxDiagnostic[]): GpxPoint | null {
  const lat = parseCoordinate(element.getAttribute('lat'));
  const lon = parseCoordinate(element.getAttribute('lon'));

  if (lat === null || lat < -90 || lat > 90) {
    diagnostics.push({ severity: 'error', code: 'invalid-latitude', message: '위도(lat)가 없거나 범위를 벗어났습니다.', path });
    return null;
  }

  if (lon === null || lon < -180 || lon > 180) {
    diagnostics.push({ severity: 'error', code: 'invalid-longitude', message: '경도(lon)가 없거나 범위를 벗어났습니다.', path });
    return null;
  }

  const eleText = textOf(element, 'ele');
  const ele = eleText === undefined ? undefined : Number(eleText);
  if (eleText !== undefined && Number.isNaN(ele)) {
    diagnostics.push({ severity: 'warning', code: 'invalid-elevation', message: '고도(ele)가 숫자가 아닙니다.', path });
  }

  const time = textOf(element, 'time');
  if (time && Number.isNaN(Date.parse(time))) {
    diagnostics.push({ severity: 'warning', code: 'invalid-time', message: '시간(time)이 ISO 8601 형식으로 해석되지 않습니다.', path });
  }

  return {
    lat,
    lon,
    ele: eleText !== undefined && !Number.isNaN(ele) ? ele : undefined,
    time,
    name: textOf(element, 'name'),
    desc: textOf(element, 'desc') ?? textOf(element, 'cmt'),
  };
}

function parseCoordinate(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOf(parent: Element, localName: string): string | undefined {
  const child = firstChild(parent, localName);
  const text = child?.textContent?.trim();
  return text || undefined;
}

function firstChild(parent: Element, localName: string): Element | undefined {
  return directChildren(parent, localName)[0];
}

function directChildren(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === localName);
}

function hasRenderableGeometry(document: GpxDocument): boolean {
  return (
    document.waypoints.length > 0 ||
    document.routes.some((route) => route.points.length > 0) ||
    document.tracks.some((track) => track.segments.some((segment) => segment.points.length > 0))
  );
}
