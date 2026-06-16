import { describe, expect, it } from 'vitest';
import multiSegment from '../fixtures/multi-segment.gpx?raw';
import mixedEntities from '../fixtures/mixed-entities.gpx?raw';
import { parseGpx } from '../../src/lib/gpx/parseGpx';
import { toRenderModel } from '../../src/lib/gpx/toRenderModel';

describe('toRenderModel', () => {
  it('preserves each GPX track segment as a render segment', () => {
    const result = parseGpx(multiSegment);
    if (!result.ok) throw new Error('expected ok');
    const model = toRenderModel(result.document);
    expect(model.trackSegments).toHaveLength(2);
    expect(model.trackSegments.map((segment) => segment.segmentIndex)).toEqual([0, 1]);
    expect(new Set(model.trackSegments.map((segment) => segment.id)).size).toBe(2);
  });

  it('keeps render layers separated by entity type', () => {
    const result = parseGpx(mixedEntities);
    if (!result.ok) throw new Error('expected ok');
    const model = toRenderModel(result.document);
    expect(model.trackSegments).toHaveLength(1);
    expect(model.routes).toHaveLength(1);
    expect(model.waypoints).toHaveLength(1);
    expect(model.bounds).toEqual({ south: 37, west: 127, north: 37.01, east: 127.01 });
  });
});
