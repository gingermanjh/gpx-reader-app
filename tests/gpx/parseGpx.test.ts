import { describe, expect, it } from 'vitest';
import singleSegment from '../fixtures/single-segment.gpx?raw';
import multiSegment from '../fixtures/multi-segment.gpx?raw';
import mixedEntities from '../fixtures/mixed-entities.gpx?raw';
import malformedXml from '../fixtures/malformed-xml.gpx?raw';
import missingCoordinates from '../fixtures/missing-coordinates.gpx?raw';
import { parseGpx } from '../../src/lib/gpx/parseGpx';

describe('parseGpx', () => {
  it('parses a single-segment track', () => {
    const result = parseGpx(singleSegment);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.document.tracks).toHaveLength(1);
    expect(result.document.tracks[0].segments).toHaveLength(1);
    expect(result.document.tracks[0].segments[0].points).toHaveLength(2);
  });

  it('preserves multi-segment track structure', () => {
    const result = parseGpx(multiSegment);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.document.tracks[0].segments).toHaveLength(2);
    expect(result.document.tracks[0].segments.map((segment) => segment.points.length)).toEqual([2, 2]);
  });

  it('keeps waypoints, routes, and tracks distinct', () => {
    const result = parseGpx(mixedEntities);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.document.waypoints).toHaveLength(1);
    expect(result.document.routes).toHaveLength(1);
    expect(result.document.routes[0].points).toHaveLength(2);
    expect(result.document.tracks).toHaveLength(1);
  });

  it('reports malformed XML as a friendly diagnostic', () => {
    const result = parseGpx(malformedXml);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'malformed-xml')).toBe(true);
  });

  it('reports missing coordinates and no renderable geometry', () => {
    const result = parseGpx(missingCoordinates);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('invalid-latitude');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('no-renderable-geometry');
  });
});

it('rejects non-GPX XML roots', () => {
  const result = parseGpx('<not-gpx><trk /></not-gpx>');
  expect(result.ok).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('invalid-root');
});

it('accepts coordinate boundary values including longitude 180', () => {
  const result = parseGpx(`<?xml version="1.0"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
    <wpt lat="-90" lon="-180"><name>South west boundary</name></wpt>
    <wpt lat="90" lon="180"><name>North east boundary</name></wpt>
  </gpx>`);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('expected ok');
  expect(result.document.waypoints).toHaveLength(2);
});
