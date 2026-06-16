import { describe, expect, it } from 'vitest';
import mixedEntities from '../fixtures/mixed-entities.gpx?raw';
import { deriveStats } from '../../src/lib/gpx/deriveStats';
import { parseGpx } from '../../src/lib/gpx/parseGpx';

describe('deriveStats', () => {
  it('derives distance, time, elevation, and structure counts', () => {
    const result = parseGpx(mixedEntities);
    if (!result.ok) throw new Error('expected ok');
    const stats = deriveStats(result.document);
    expect(stats.trackDistance.meters).toBeGreaterThan(700);
    expect(stats.time.elapsedSeconds).toBe(300);
    expect(stats.elevation.min).toBe(10);
    expect(stats.elevation.max).toBe(30);
    expect(stats.counts).toMatchObject({ waypoints: 1, routes: 1, routePoints: 2, tracks: 1, trackSegments: 1, trackPoints: 2 });
  });
});

it('computes elevation gain/loss from track segments only', () => {
  const result = parseGpx(`<?xml version="1.0"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
    <wpt lat="37.0" lon="127.0"><ele>1000</ele><name>Unrelated summit</name></wpt>
    <rte><rtept lat="37.0" lon="127.0"><ele>5</ele></rtept><rtept lat="37.1" lon="127.1"><ele>900</ele></rtept></rte>
    <trk><trkseg>
      <trkpt lat="37.0" lon="127.0"><ele>10</ele></trkpt>
      <trkpt lat="37.1" lon="127.1"><ele>20</ele></trkpt>
    </trkseg><trkseg>
      <trkpt lat="37.2" lon="127.2"><ele>100</ele></trkpt>
      <trkpt lat="37.3" lon="127.3"><ele>90</ele></trkpt>
    </trkseg></trk>
  </gpx>`);
  if (!result.ok) throw new Error('expected ok');
  const stats = deriveStats(result.document);
  expect(stats.elevation.min).toBe(10);
  expect(stats.elevation.max).toBe(100);
  expect(stats.elevation.gain).toBe(10);
  expect(stats.elevation.loss).toBe(10);
});
