import { describe, expect, it } from 'vitest';
import multiSegment from '../fixtures/multi-segment.gpx?raw';
import { buildActivitySeries } from '../../src/lib/gpx/activitySeries';
import { parseGpx } from '../../src/lib/gpx/parseGpx';

describe('buildActivitySeries', () => {
  it('builds D3-ready samples while preserving segment identity', () => {
    const result = parseGpx(multiSegment);
    if (!result.ok) throw new Error('expected ok');
    const samples = buildActivitySeries(result.document);
    expect(samples).toHaveLength(4);
    expect(samples.map((sample) => sample.segmentIndex)).toEqual([0, 0, 1, 1]);
    expect(samples[0].distanceMeters).toBe(0);
    expect(samples[1].distanceMeters).toBeGreaterThan(100);
    expect(samples[2].speedKph).toBeUndefined();
    expect(samples[3].speedKph).toBeGreaterThan(0);
  });
});
