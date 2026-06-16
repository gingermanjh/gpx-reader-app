import { describe, expect, it } from 'vitest';
import mixedEntities from '../fixtures/mixed-entities.gpx?raw';
import demo from '../../public/sample/demo.gpx?raw';
import { buildActivitySeries } from '../../src/lib/gpx/activitySeries';
import { analyzeCourse, buildPacingPlan } from '../../src/lib/gpx/courseAnalysis';
import { parseGpx } from '../../src/lib/gpx/parseGpx';

describe('analyzeCourse', () => {
  it('derives grade distribution, splits, warnings, and waypoint aid stations', () => {
    const result = parseGpx(demo);
    if (!result.ok) throw new Error('expected ok');
    const samples = buildActivitySeries(result.document);
    const analysis = analyzeCourse(result.document, samples);
    expect(analysis.legs.length).toBeGreaterThan(0);
    expect(analysis.climbs.length).toBeGreaterThan(0);
    expect(analysis.gradeDistribution.reduce((sum, band) => sum + band.distanceMeters, 0)).toBeCloseTo(analysis.totalDistanceMeters, 3);
    expect(analysis.splits.length).toBeGreaterThan(1);
    expect(analysis.aidStations).toHaveLength(1);
    expect(analysis.warnings.map((warning) => warning.id)).toContain('hardest-climb');
  });

  it('builds a grade-aware pacing plan when a target time is supplied', () => {
    const result = parseGpx(mixedEntities);
    if (!result.ok) throw new Error('expected ok');
    const analysis = analyzeCourse(result.document, buildActivitySeries(result.document));
    const plan = buildPacingPlan(analysis, 3600);
    expect(plan).toHaveLength(analysis.splits.length);
    expect(plan.reduce((sum, split) => sum + split.estimatedSeconds, 0)).toBe(3600);
    expect(plan.every((split) => split.targetPaceSecondsPerKm > 0)).toBe(true);
  });
});
