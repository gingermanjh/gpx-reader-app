import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';
import type { GpxStats } from '../../lib/gpx/types';

interface SummaryCardsProps {
  stats: GpxStats;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <Card className="summary-card-stack" aria-label="GPX summary">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Activity summary</p>
          <h2>핵심 정보</h2>
        </div>
        <Badge tone="blue">local GPX</Badge>
      </div>

      <section className="metric-grid">
        <MetricCard
          label="Track distance"
          value={formatDistance(stats.trackDistance.meters)}
          description="트랙포인트를 순서대로 연결해 계산한 실제 이동 거리입니다."
          meta={stats.routeDistance.meters > 0 ? `Route ${formatDistance(stats.routeDistance.meters)}` : 'route 없음'}
          tone="blue"
        />
        <MetricCard
          label="Elapsed time"
          value={formatDuration(stats.time.elapsedSeconds)}
          description="트랙포인트의 가장 이른 시간과 가장 늦은 시간 사이의 경과 시간입니다."
          meta={formatTimeRange(stats.time.start, stats.time.end)}
          tone="green"
        />
        <MetricCard
          label="Elevation"
          value={formatElevationRange(stats.elevation)}
          description="트랙에 기록된 고도값의 최저/최고와 누적 상승/누적 하강입니다."
          meta={formatElevationGainLoss(stats.elevation)}
          tone="amber"
        />
        <MetricCard
          label="Structure"
          value={`${stats.counts.tracks} trk · ${stats.counts.trackSegments} seg`}
          description="파일 안에 들어있는 GPX 구성요소 수입니다. trk는 활동 기록, seg는 끊긴 구간, wpt는 장소 마커입니다."
          meta={`${stats.counts.trackPoints} trkpt · ${stats.counts.routes} rte · ${stats.counts.waypoints} wpt`}
          tone="purple"
        />
      </section>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  description,
  meta,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  meta: string;
  tone: 'blue' | 'green' | 'amber' | 'purple';
}) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__label">
        <span>{label}</span>
        <InfoTooltip label={label}>{description}</InfoTooltip>
      </div>
      <strong>{value}</strong>
      <p>{meta}</p>
    </article>
  );
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return 'N/A';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}

function formatElevationRange(elevation: GpxStats['elevation']): string {
  if (elevation.min === undefined || elevation.max === undefined) return 'N/A';
  return `${Math.round(elevation.min)}–${Math.round(elevation.max)} m`;
}

function formatElevationGainLoss(elevation: GpxStats['elevation']): string {
  if (elevation.min === undefined || elevation.max === undefined) return '고도 데이터 없음';
  return `누적 상승 +${Math.round(elevation.gain ?? 0)} m · 누적 하강 -${Math.round(elevation.loss ?? 0)} m`;
}

function formatTimeRange(start?: string, end?: string): string {
  if (!start || !end) return '시간 데이터 없음';
  return `${formatClock(start)} → ${formatClock(end)}`;
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
