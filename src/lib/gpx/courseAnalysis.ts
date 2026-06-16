import type { ActivitySample } from './activitySeries';
import type { GpxDocument } from './types';

export type GradeKind = 'steep-descent' | 'descent' | 'flat' | 'climb' | 'steep-climb';
export type TerrainKind = 'climb' | 'descent' | 'flat';

export interface CourseLeg {
  id: string;
  from: ActivitySample;
  to: ActivitySample;
  startDistanceMeters: number;
  endDistanceMeters: number;
  distanceMeters: number;
  elevationDeltaMeters: number;
  gradePercent?: number;
  gradeKind: GradeKind;
  terrainKind: TerrainKind;
}

export interface CourseSegment {
  id: string;
  kind: TerrainKind;
  startDistanceMeters: number;
  endDistanceMeters: number;
  distanceMeters: number;
  elevationDeltaMeters: number;
  averageGradePercent?: number;
  maxAbsGradePercent?: number;
  from: ActivitySample;
  to: ActivitySample;
}

export interface GradeDistributionBand {
  kind: GradeKind;
  label: string;
  distanceMeters: number;
  ratio: number;
}

export interface CourseSplit {
  id: string;
  index: number;
  startDistanceMeters: number;
  endDistanceMeters: number;
  distanceMeters: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  averageGradePercent?: number;
  weightedDistanceMeters: number;
}

export interface AidStationPlan {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  elevationMeters?: number;
  distanceFromPreviousMeters: number;
  gainFromPreviousMeters: number;
  lossFromPreviousMeters: number;
}

export interface CourseWarning {
  id: string;
  severity: 'info' | 'warning';
  title: string;
  detail: string;
}

export interface CourseAnalysis {
  totalDistanceMeters: number;
  legs: CourseLeg[];
  segments: CourseSegment[];
  climbs: CourseSegment[];
  descents: CourseSegment[];
  gradeDistribution: GradeDistributionBand[];
  splits: CourseSplit[];
  aidStations: AidStationPlan[];
  warnings: CourseWarning[];
}

export interface RacePacingSplit extends CourseSplit {
  estimatedSeconds: number;
  estimatedArrivalSeconds: number;
  targetPaceSecondsPerKm: number;
}

const GRADE_BANDS: Array<{ kind: GradeKind; label: string }> = [
  { kind: 'steep-descent', label: '급내리막 ≤ -8%' },
  { kind: 'descent', label: '내리막 -8~ -3%' },
  { kind: 'flat', label: '평지 -3~3%' },
  { kind: 'climb', label: '오르막 3~8%' },
  { kind: 'steep-climb', label: '급오르막 ≥ 8%' },
];

export function analyzeCourse(document: GpxDocument, samples: ActivitySample[]): CourseAnalysis {
  const legs = buildCourseLegs(samples);
  const totalDistanceMeters = samples.at(-1)?.distanceMeters ?? 0;
  const segments = buildTerrainSegments(legs);
  const splits = buildSplits(legs, totalDistanceMeters);
  const aidStations = buildAidStations(document, samples, legs);
  const analysis: CourseAnalysis = {
    totalDistanceMeters,
    legs,
    segments,
    climbs: segments.filter((segment) => segment.kind === 'climb'),
    descents: segments.filter((segment) => segment.kind === 'descent'),
    gradeDistribution: buildGradeDistribution(legs, totalDistanceMeters),
    splits,
    aidStations,
    warnings: [],
  };
  analysis.warnings = buildWarnings(analysis);
  return analysis;
}

export function buildPacingPlan(analysis: CourseAnalysis, targetSeconds: number): RacePacingSplit[] {
  if (!Number.isFinite(targetSeconds) || targetSeconds <= 0 || analysis.splits.length === 0) return [];
  const totalWeighted = Math.max(1, analysis.splits.reduce((sum, split) => sum + split.weightedDistanceMeters, 0));
  let cumulative = 0;
  return analysis.splits.map((split) => {
    const estimatedSeconds = Math.round((split.weightedDistanceMeters / totalWeighted) * targetSeconds);
    cumulative += estimatedSeconds;
    return {
      ...split,
      estimatedSeconds,
      estimatedArrivalSeconds: cumulative,
      targetPaceSecondsPerKm: split.distanceMeters > 0 ? estimatedSeconds / (split.distanceMeters / 1000) : 0,
    };
  });
}

function buildCourseLegs(samples: ActivitySample[]): CourseLeg[] {
  return samples.slice(1).flatMap((sample, index) => {
    const previous = samples[index];
    if (!previous) return [];
    const distanceMeters = Math.max(0, sample.distanceMeters - previous.distanceMeters);
    if (distanceMeters <= 0) return [];
    const elevationDeltaMeters = typeof sample.ele === 'number' && typeof previous.ele === 'number' ? sample.ele - previous.ele : 0;
    const gradePercent = typeof sample.ele === 'number' && typeof previous.ele === 'number'
      ? (elevationDeltaMeters / distanceMeters) * 100
      : undefined;
    const gradeKind = gradeKindFor(gradePercent);
    return [{
      id: `${previous.id}-${sample.id}`,
      from: previous,
      to: sample,
      startDistanceMeters: previous.distanceMeters,
      endDistanceMeters: sample.distanceMeters,
      distanceMeters,
      elevationDeltaMeters,
      gradePercent,
      gradeKind,
      terrainKind: terrainKindFor(gradePercent),
    }];
  });
}

function buildTerrainSegments(legs: CourseLeg[]): CourseSegment[] {
  const segments: CourseSegment[] = [];
  let current: CourseSegment | undefined;
  for (const leg of legs) {
    if (!current || current.kind !== leg.terrainKind) {
      current = segmentFromLeg(leg, segments.length + 1);
      segments.push(current);
      continue;
    }
    current.endDistanceMeters = leg.endDistanceMeters;
    current.distanceMeters += leg.distanceMeters;
    current.elevationDeltaMeters += leg.elevationDeltaMeters;
    current.to = leg.to;
    current.averageGradePercent = current.distanceMeters > 0 ? (current.elevationDeltaMeters / current.distanceMeters) * 100 : undefined;
    current.maxAbsGradePercent = Math.max(current.maxAbsGradePercent ?? 0, Math.abs(leg.gradePercent ?? 0));
  }
  return segments.filter((segment) => segment.distanceMeters >= 5);
}

function segmentFromLeg(leg: CourseLeg, index: number): CourseSegment {
  return {
    id: `${leg.terrainKind}-${index}`,
    kind: leg.terrainKind,
    startDistanceMeters: leg.startDistanceMeters,
    endDistanceMeters: leg.endDistanceMeters,
    distanceMeters: leg.distanceMeters,
    elevationDeltaMeters: leg.elevationDeltaMeters,
    averageGradePercent: leg.gradePercent,
    maxAbsGradePercent: Math.abs(leg.gradePercent ?? 0),
    from: leg.from,
    to: leg.to,
  };
}

function buildGradeDistribution(legs: CourseLeg[], totalDistanceMeters: number): GradeDistributionBand[] {
  return GRADE_BANDS.map((band) => {
    const distanceMeters = legs
      .filter((leg) => leg.gradeKind === band.kind)
      .reduce((sum, leg) => sum + leg.distanceMeters, 0);
    return {
      ...band,
      distanceMeters,
      ratio: totalDistanceMeters > 0 ? distanceMeters / totalDistanceMeters : 0,
    };
  });
}

function buildSplits(legs: CourseLeg[], totalDistanceMeters: number): CourseSplit[] {
  if (totalDistanceMeters <= 0) return [];
  const splitMeters = totalDistanceMeters < 3000 ? 500 : 1000;
  const splits: CourseSplit[] = [];
  for (let start = 0, index = 1; start < totalDistanceMeters - 1; start += splitMeters, index += 1) {
    const end = Math.min(totalDistanceMeters, start + splitMeters);
    const slice = legsWithinRange(legs, start, end);
    const gain = slice.reduce((sum, leg) => sum + Math.max(0, leg.elevationDeltaMeters * leg.overlapRatio), 0);
    const loss = slice.reduce((sum, leg) => sum + Math.max(0, -leg.elevationDeltaMeters * leg.overlapRatio), 0);
    const weightedDistanceMeters = slice.reduce((sum, leg) => sum + leg.distanceMeters * leg.overlapRatio * effortFactor(leg.gradePercent), 0);
    const distanceMeters = end - start;
    splits.push({
      id: `split-${index}`,
      index,
      startDistanceMeters: start,
      endDistanceMeters: end,
      distanceMeters,
      elevationGainMeters: gain,
      elevationLossMeters: loss,
      averageGradePercent: distanceMeters > 0 ? ((gain - loss) / distanceMeters) * 100 : undefined,
      weightedDistanceMeters: Math.max(1, weightedDistanceMeters),
    });
  }
  return splits;
}

function legsWithinRange(legs: CourseLeg[], start: number, end: number): Array<CourseLeg & { overlapRatio: number }> {
  return legs.flatMap((leg) => {
    const overlapStart = Math.max(start, leg.startDistanceMeters);
    const overlapEnd = Math.min(end, leg.endDistanceMeters);
    if (overlapEnd <= overlapStart || leg.distanceMeters <= 0) return [];
    return [{ ...leg, overlapRatio: (overlapEnd - overlapStart) / leg.distanceMeters }];
  });
}

function buildAidStations(document: GpxDocument, samples: ActivitySample[], legs: CourseLeg[]): AidStationPlan[] {
  if (samples.length === 0) return [];
  const stations = document.waypoints.map((waypoint) => {
    const nearest = nearestSample(samples, waypoint.lat, waypoint.lon);
    return {
      id: waypoint.id,
      name: waypoint.name || waypoint.id,
      lat: waypoint.lat,
      lon: waypoint.lon,
      distanceMeters: nearest.distanceMeters,
      elevationMeters: nearest.ele,
    };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);

  return stations.map((station, index) => {
    const previousDistance = stations[index - 1]?.distanceMeters ?? 0;
    const slice = legsWithinRange(legs, previousDistance, station.distanceMeters);
    return {
      ...station,
      distanceFromPreviousMeters: station.distanceMeters - previousDistance,
      gainFromPreviousMeters: slice.reduce((sum, leg) => sum + Math.max(0, leg.elevationDeltaMeters * leg.overlapRatio), 0),
      lossFromPreviousMeters: slice.reduce((sum, leg) => sum + Math.max(0, -leg.elevationDeltaMeters * leg.overlapRatio), 0),
    };
  });
}

function nearestSample(samples: ActivitySample[], lat: number, lon: number): ActivitySample {
  return samples.reduce((nearest, sample) => {
    const nearestScore = squaredDistance(nearest.lat, nearest.lon, lat, lon);
    const sampleScore = squaredDistance(sample.lat, sample.lon, lat, lon);
    return sampleScore < nearestScore ? sample : nearest;
  }, samples[0]);
}

function buildWarnings(analysis: CourseAnalysis): CourseWarning[] {
  const warnings: CourseWarning[] = [];
  const hardestClimb = [...analysis.climbs].sort((a, b) => b.elevationDeltaMeters - a.elevationDeltaMeters)[0];
  const longestDescent = [...analysis.descents].sort((a, b) => b.distanceMeters - a.distanceMeters)[0];
  const lateClimb = analysis.climbs.find((segment) => segment.startDistanceMeters / Math.max(1, analysis.totalDistanceMeters) >= 0.65);
  const steepShare = analysis.gradeDistribution
    .filter((band) => band.kind === 'steep-climb' || band.kind === 'steep-descent')
    .reduce((sum, band) => sum + band.ratio, 0);

  if (hardestClimb) {
    warnings.push({
      id: 'hardest-climb',
      severity: hardestClimb.averageGradePercent && hardestClimb.averageGradePercent >= 8 ? 'warning' : 'info',
      title: '가장 큰 오르막 구간',
      detail: `${formatDistance(hardestClimb.startDistanceMeters)}–${formatDistance(hardestClimb.endDistanceMeters)}, +${Math.round(hardestClimb.elevationDeltaMeters)} m 상승`,
    });
  }
  if (longestDescent) {
    warnings.push({
      id: 'longest-descent',
      severity: 'info',
      title: '긴 내리막 구간',
      detail: `${formatDistance(longestDescent.startDistanceMeters)}–${formatDistance(longestDescent.endDistanceMeters)}, ${formatDistance(longestDescent.distanceMeters)} 동안 하강`,
    });
  }
  if (lateClimb) {
    warnings.push({
      id: 'late-climb',
      severity: 'warning',
      title: '후반 오르막 주의',
      detail: `전체 거리의 ${Math.round((lateClimb.startDistanceMeters / Math.max(1, analysis.totalDistanceMeters)) * 100)}% 지점 이후 오르막이 있습니다.`,
    });
  }
  if (steepShare >= 0.15) {
    warnings.push({
      id: 'steep-share',
      severity: 'warning',
      title: '급경사 비중 높음',
      detail: `전체 거리 중 약 ${Math.round(steepShare * 100)}%가 ±8% 이상 급경사입니다.`,
    });
  }
  if (analysis.aidStations.length > 0) {
    const longestAidGap = [...analysis.aidStations].sort((a, b) => b.distanceFromPreviousMeters - a.distanceFromPreviousMeters)[0];
    warnings.push({
      id: 'aid-gap',
      severity: 'info',
      title: '보급 지점 확인',
      detail: `가장 긴 보급 간격은 ${longestAidGap.name}까지 ${formatDistance(longestAidGap.distanceFromPreviousMeters)}입니다.`,
    });
  }
  return warnings;
}

function gradeKindFor(grade?: number): GradeKind {
  if (grade === undefined || !Number.isFinite(grade)) return 'flat';
  if (grade <= -8) return 'steep-descent';
  if (grade < -3) return 'descent';
  if (grade >= 8) return 'steep-climb';
  if (grade > 3) return 'climb';
  return 'flat';
}

function terrainKindFor(grade?: number): TerrainKind {
  if (grade === undefined || !Number.isFinite(grade)) return 'flat';
  if (grade > 3) return 'climb';
  if (grade < -3) return 'descent';
  return 'flat';
}

function effortFactor(grade?: number): number {
  if (grade === undefined || !Number.isFinite(grade)) return 1;
  if (grade > 0) return 1 + Math.min(0.85, grade / 12);
  return Math.max(0.72, 1 + grade / 30);
}

function squaredDistance(aLat: number, aLon: number, bLat: number, bLon: number): number {
  return (aLat - bLat) ** 2 + (aLon - bLon) ** 2;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
