import { useMemo, useState } from 'react';
import { buildPacingPlan, type CourseAnalysis, type CourseSegment } from '../../lib/gpx/courseAnalysis';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';

interface RacePlannerProps {
  analysis: CourseAnalysis;
}

export function RacePlanner({ analysis }: RacePlannerProps) {
  const [target, setTarget] = useState('');
  const [cutoff, setCutoff] = useState('');
  const [context, setContext] = useState({ heat: '', altitude: '', night: '', surface: '' });
  const targetSeconds = parseTargetTime(target);
  const cutoffSeconds = parseTargetTime(cutoff);
  const pacingPlan = useMemo(() => buildPacingPlan(analysis, targetSeconds ?? 0), [analysis, targetSeconds]);
  const hardestClimb = [...analysis.climbs].sort((a, b) => b.elevationDeltaMeters - a.elevationDeltaMeters)[0];

  return (
    <section className="race-grid" aria-label="Race planning insights">
      <Card className="race-card race-card--wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pre-race intelligence</p>
            <h2>레이스 전 코스 전략</h2>
          </div>
          <Badge tone="amber">grade-aware</Badge>
        </div>
        <div className="race-kpi-grid">
          <RaceKpi label="총 거리" value={formatDistance(analysis.totalDistanceMeters)} help="트랙포인트 누적 거리입니다. 레이스 공식 거리와 GPS 거리에는 차이가 있을 수 있습니다." />
          <RaceKpi label="오르막 구간" value={`${analysis.climbs.length}개`} help="평균 경사 3% 이상이 이어지는 구간입니다." />
          <RaceKpi label="내리막 구간" value={`${analysis.descents.length}개`} help="평균 경사 -3% 이하가 이어지는 구간입니다." />
          <RaceKpi label="최대 상승 구간" value={hardestClimb ? `+${Math.round(hardestClimb.elevationDeltaMeters)} m` : 'N/A'} help="누적 상승량이 가장 큰 climb segment입니다." />
        </div>
      </Card>

      <Card className="race-card">
        <div className="section-heading section-heading--compact">
          <h3>Course warnings</h3>
          <Badge tone="amber">자동 코멘트</Badge>
        </div>
        <div className="warning-list">
          {analysis.warnings.length === 0 ? <p>특별한 주의 구간을 찾지 못했습니다.</p> : analysis.warnings.map((warning) => (
            <article className={`warning-item warning-item--${warning.severity}`} key={warning.id}>
              <strong>{warning.title}</strong>
              <p>{warning.detail}</p>
            </article>
          ))}
        </div>
      </Card>

      <Card className="race-card">
        <div className="section-heading section-heading--compact">
          <h3>Grade distribution</h3>
          <InfoTooltip label="Grade distribution">전체 코스를 경사도 구간별 거리 비중으로 나눈 차트입니다.</InfoTooltip>
        </div>
        <div className="grade-stack" aria-label="경사도 분포">
          {analysis.gradeDistribution.map((band) => (
            <span
              key={band.kind}
              className={`grade-stack__bar grade-stack__bar--${band.kind}`}
              style={{ width: `${Math.max(1.5, band.ratio * 100)}%` }}
              title={`${band.label}: ${formatDistance(band.distanceMeters)}`}
            />
          ))}
        </div>
        <div className="grade-legend-list">
          {analysis.gradeDistribution.map((band) => (
            <span key={band.kind}><i className={`grade-dot grade-dot--${band.kind}`} /> {band.label} · {formatDistance(band.distanceMeters)}</span>
          ))}
        </div>
      </Card>

      <Card className="race-card race-card--wide">
        <div className="section-heading">
          <div>
            <h3>Climb / descent segments</h3>
            <p>오르막과 내리막이 어디서 시작하고 끝나는지 레이스 전에 확인하세요.</p>
          </div>
        </div>
        <SegmentTable segments={[...analysis.climbs, ...analysis.descents].sort((a, b) => a.startDistanceMeters - b.startDistanceMeters)} />
      </Card>

      <Card className="race-card race-card--wide">
        <div className="section-heading">
          <div>
            <h3>Split planner</h3>
            <p>짧은 코스는 500m, 긴 코스는 1km 단위로 상승/하강과 예상 페이스를 봅니다.</p>
          </div>
          <div className="planner-inputs">
            <label className="target-time-input">
              목표 완주 시간
              <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="예: 1:45:00" inputMode="numeric" />
            </label>
            <label className="target-time-input">
              컷오프 시간
              <input value={cutoff} onChange={(event) => setCutoff(event.target.value)} placeholder="예: 2:30:00" inputMode="numeric" />
            </label>
          </div>
        </div>
        <div className="strategy-impact">
          <strong>입력값 반영 위치</strong>
          <ul>
            <li>목표 완주 시간: Split planner의 권장 페이스와 예상 도착 시간을 계산합니다.</li>
            <li>목표 완주 시간: Aid station timeline의 각 보급 지점 예상 도착 시간을 계산합니다.</li>
            <li>컷오프 시간: 목표 완주 시간과 함께 입력하면 각 보급 지점의 컷오프 여유 시간을 표시합니다.</li>
          </ul>
          <p>{targetSeconds ? `현재 목표 완주 시간은 ${formatDuration(targetSeconds)}입니다.` : '목표 완주 시간을 입력하면 split별 권장 페이스가 나타납니다.'}</p>
          <p>{cutoffSeconds ? `현재 컷오프 시간은 ${formatDuration(cutoffSeconds)}입니다. 컷오프는 전체 거리 비율로 각 보급 지점에 배분합니다.` : '컷오프 시간을 입력하면 보급 지점별 시간 여유를 계산합니다.'}</p>
        </div>
        <SplitTable analysis={analysis} pacingPlan={pacingPlan} />
      </Card>

      <Card className="race-card race-card--wide">
        <div className="section-heading">
          <div>
            <h3>Aid station timeline</h3>
            <p>GPX waypoint를 보급/체크포인트 후보로 보고 거리와 직전 구간 상승량을 계산합니다.</p>
          </div>
          <Badge tone="green">waypoints</Badge>
        </div>
        {analysis.aidStations.length === 0 ? <p>GPX waypoint가 없어 보급 지점 후보를 만들 수 없습니다.</p> : (
          <div className="aid-timeline">
            {analysis.aidStations.map((station) => {
              const arrivalSeconds = targetSeconds ? estimateSecondsAtDistance(analysis, targetSeconds, station.distanceMeters) : undefined;
              const cutoffAtStation = cutoffSeconds ? Math.round(cutoffSeconds * (station.distanceMeters / Math.max(1, analysis.totalDistanceMeters))) : undefined;
              const slackSeconds = arrivalSeconds !== undefined && cutoffAtStation !== undefined ? cutoffAtStation - arrivalSeconds : undefined;
              return (
                <article className="aid-stop" key={station.id} style={{ left: `${Math.min(100, Math.max(0, (station.distanceMeters / Math.max(1, analysis.totalDistanceMeters)) * 100))}%` }}>
                  <strong>{station.name}</strong>
                  <span>{formatDistance(station.distanceMeters)}</span>
                  <small>직전 +{Math.round(station.gainFromPreviousMeters)} m / -{Math.round(station.lossFromPreviousMeters)} m</small>
                  {arrivalSeconds !== undefined ? <small>예상 도착 {formatDuration(arrivalSeconds)}</small> : null}
                  {slackSeconds !== undefined ? <small className={slackSeconds < 0 ? 'slack-negative' : 'slack-positive'}>컷오프 여유 {formatSignedDuration(slackSeconds)}</small> : null}
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="race-card race-card--wide">
        <div className="section-heading">
          <div>
            <h3>Race context checklist</h3>
            <p>외부 날씨/노면 API 없이, 레이스 공지에서 확인한 환경 정보를 직접 기록해 전략 체크리스트로 씁니다.</p>
          </div>
          <Badge tone="purple">manual context</Badge>
        </div>
        <div className="context-grid">
          <label>더위/습도<input value={context.heat} onChange={(event) => setContext({ ...context, heat: event.target.value })} placeholder="예: 낮 28℃, 습도 높음" /></label>
          <label>고도/노출<input value={context.altitude} onChange={(event) => setContext({ ...context, altitude: event.target.value })} placeholder="예: 능선 노출, 최고 900m" /></label>
          <label>야간 구간<input value={context.night} onChange={(event) => setContext({ ...context, night: event.target.value })} placeholder="예: 후반 18km 이후 야간" /></label>
          <label>노면/지형<input value={context.surface} onChange={(event) => setContext({ ...context, surface: event.target.value })} placeholder="예: 싱글트랙, 계단, 자갈" /></label>
        </div>
        <ul className="context-checklist">
          {context.heat ? <li>더위/습도: {context.heat} → 수분/전해질 계획을 보수적으로 잡기</li> : null}
          {context.altitude ? <li>고도/노출: {context.altitude} → 바람막이·자외선·호흡 부담 확인</li> : null}
          {context.night ? <li>야간: {context.night} → 헤드램프, 예비 배터리, 야간 페이스 하향</li> : null}
          {context.surface ? <li>노면: {context.surface} → 신발/스틱/다운힐 리스크 점검</li> : null}
          {!context.heat && !context.altitude && !context.night && !context.surface ? <li>레이스 공지의 날씨, 컷오프, 보급, 필수 장비 정보를 입력하면 체크리스트가 생성됩니다.</li> : null}
        </ul>
      </Card>
    </section>
  );
}

function RaceKpi({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <article className="race-kpi">
      <span>{label} <InfoTooltip label={label}>{help}</InfoTooltip></span>
      <strong>{value}</strong>
    </article>
  );
}

function SegmentTable({ segments }: { segments: CourseSegment[] }) {
  if (segments.length === 0) return <p>감지된 오르막/내리막 구간이 없습니다.</p>;
  return (
    <div className="table-scroll">
      <table className="race-table">
        <thead>
          <tr><th>종류</th><th>구간</th><th>길이</th><th>고도 변화</th><th>평균 경사</th></tr>
        </thead>
        <tbody>
          {segments.map((segment) => (
            <tr key={segment.id}>
              <td><Badge tone={segment.kind === 'climb' ? 'amber' : 'blue'}>{segment.kind === 'climb' ? '오르막' : '내리막'}</Badge></td>
              <td>{formatDistance(segment.startDistanceMeters)}–{formatDistance(segment.endDistanceMeters)}</td>
              <td>{formatDistance(segment.distanceMeters)}</td>
              <td>{formatSignedMeters(segment.elevationDeltaMeters)}</td>
              <td>{formatPercent(segment.averageGradePercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SplitTable({ analysis, pacingPlan }: { analysis: CourseAnalysis; pacingPlan: ReturnType<typeof buildPacingPlan> }) {
  const hasPacing = pacingPlan.length > 0;
  if (hasPacing) {
    return (
      <div className="table-scroll">
        <table className="race-table">
          <thead>
            <tr><th>Split</th><th>구간</th><th>상승/하강</th><th>평균 경사</th><th>권장 페이스</th><th>예상 도착</th></tr>
          </thead>
          <tbody>
            {pacingPlan.map((split) => (
              <tr key={split.id}>
                <td>{split.index}</td>
                <td>{formatDistance(split.startDistanceMeters)}–{formatDistance(split.endDistanceMeters)}</td>
                <td>+{Math.round(split.elevationGainMeters)} / -{Math.round(split.elevationLossMeters)} m</td>
                <td>{formatPercent(split.averageGradePercent)}</td>
                <td>{formatPace(split.targetPaceSecondsPerKm)}</td>
                <td>{formatDuration(split.estimatedArrivalSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="race-table">
        <thead>
          <tr><th>Split</th><th>구간</th><th>상승/하강</th><th>평균 경사</th></tr>
        </thead>
        <tbody>
          {analysis.splits.map((split) => (
            <tr key={split.id}>
              <td>{split.index}</td>
              <td>{formatDistance(split.startDistanceMeters)}–{formatDistance(split.endDistanceMeters)}</td>
              <td>+{Math.round(split.elevationGainMeters)} / -{Math.round(split.elevationLossMeters)} m</td>
              <td>{formatPercent(split.averageGradePercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function estimateSecondsAtDistance(analysis: CourseAnalysis, targetSeconds: number, distanceMeters: number): number {
  const plan = buildPacingPlan(analysis, targetSeconds);
  if (plan.length === 0) return Math.round(targetSeconds * (distanceMeters / Math.max(1, analysis.totalDistanceMeters)));
  let elapsed = 0;
  for (const split of plan) {
    if (distanceMeters >= split.endDistanceMeters) {
      elapsed = split.estimatedArrivalSeconds;
      continue;
    }
    if (distanceMeters >= split.startDistanceMeters) {
      const ratio = (distanceMeters - split.startDistanceMeters) / Math.max(1, split.distanceMeters);
      return Math.round(elapsed + split.estimatedSeconds * ratio);
    }
  }
  return elapsed;
}

function parseTargetTime(value: string): number | undefined {
  const parts = value.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return undefined;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return undefined;
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return 'N/A';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatSignedMeters(meters: number): string {
  const rounded = Math.round(meters);
  return `${rounded > 0 ? '+' : ''}${rounded} m`;
}

function formatPercent(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return 'N/A';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}/km`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const rest = Math.round(seconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

function formatSignedDuration(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  return `${sign}${formatDuration(Math.abs(seconds))}`;
}
