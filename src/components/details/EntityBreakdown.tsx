import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';
import type { GpxDocument } from '../../lib/gpx/types';

interface EntityBreakdownProps {
  document: GpxDocument;
}

const TERM_DESCRIPTIONS = {
  gpx: 'GPS Exchange Format 파일입니다. 여러 앱과 기기에서 경로, 장소, 고도, 시간 정보를 주고받기 위해 쓰는 XML 형식입니다.',
  track: 'Track(trk)은 실제로 기록된 이동 궤적입니다. 운동 기록처럼 “어디를 지나갔는지”를 나타냅니다.',
  segment: 'Segment(trkseg)는 트랙 안에서 끊긴 구간입니다. 녹화 일시정지, GPS 끊김, 여러 구간 기록 때 나뉠 수 있습니다.',
  trackPoint: 'Track point(trkpt)는 트랙을 이루는 한 점입니다. 좌표와 함께 고도(ele), 시간(time)이 들어갈 수 있습니다.',
  route: 'Route(rte)는 실제 기록이라기보다 계획된 경로에 가깝습니다. 지나갈 지점들을 순서대로 담습니다.',
  routePoint: 'Route point(rtept)는 route 안의 경유 지점입니다.',
  waypoint: 'Waypoint(wpt)는 경로와 별개로 저장된 관심 장소입니다. 출발지, 급수대, 전망대 같은 마커로 볼 수 있습니다.',
};

export function EntityBreakdown({ document }: EntityBreakdownProps) {
  const trackPointCount = document.tracks.reduce(
    (sum, track) => sum + track.segments.reduce((segmentSum, segment) => segmentSum + segment.points.length, 0),
    0,
  );
  const routePointCount = document.routes.reduce((sum, route) => sum + route.points.length, 0);

  return (
    <Card className="details-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Readable structure</p>
          <h2>
            GPX structure <InfoTooltip label="GPX structure">{TERM_DESCRIPTIONS.gpx}</InfoTooltip>
          </h2>
        </div>
        <Badge tone="purple">{trackPointCount + routePointCount + document.waypoints.length} points</Badge>
      </div>

      <div className="structure-overview" aria-label="GPX structure overview">
        <StructurePill label="trk" value={document.tracks.length} help={TERM_DESCRIPTIONS.track} />
        <StructurePill label="trkseg" value={document.tracks.reduce((sum, track) => sum + track.segments.length, 0)} help={TERM_DESCRIPTIONS.segment} />
        <StructurePill label="trkpt" value={trackPointCount} help={TERM_DESCRIPTIONS.trackPoint} />
        <StructurePill label="rte" value={document.routes.length} help={TERM_DESCRIPTIONS.route} />
        <StructurePill label="rtept" value={routePointCount} help={TERM_DESCRIPTIONS.routePoint} />
        <StructurePill label="wpt" value={document.waypoints.length} help={TERM_DESCRIPTIONS.waypoint} />
      </div>

      <div className="detail-section">
        <h3>
          Tracks <InfoTooltip label="Tracks">{TERM_DESCRIPTIONS.track}</InfoTooltip>
        </h3>
        {document.tracks.length === 0 ? <p>N/A</p> : document.tracks.map((track) => (
          <article className="structure-item" key={track.id}>
            <div className="structure-item__header">
              <strong>{track.name || track.id}</strong>
              <Badge tone="blue">{track.segments.length} segment</Badge>
            </div>
            <p>{track.segments.reduce((sum, segment) => sum + segment.points.length, 0)}개의 track point로 이루어진 실제 이동 기록입니다.</p>
            <ol className="segment-list">
              {track.segments.map((segment, index) => (
                <li key={segment.id}>
                  <span>Segment {index + 1}</span>
                  <strong>{segment.points.length} trkpt</strong>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <div className="detail-section">
        <h3>
          Routes <InfoTooltip label="Routes">{TERM_DESCRIPTIONS.route}</InfoTooltip>
        </h3>
        {document.routes.length === 0 ? <p>N/A</p> : document.routes.map((route) => (
          <article className="structure-item structure-item--compact" key={route.id}>
            <strong>{route.name || route.id}</strong>
            <p>{route.points.length}개의 route point로 이루어진 계획/안내 경로입니다.</p>
          </article>
        ))}
      </div>

      <div className="detail-section">
        <h3>
          Waypoints <InfoTooltip label="Waypoints">{TERM_DESCRIPTIONS.waypoint}</InfoTooltip>
        </h3>
        {document.waypoints.length === 0 ? <p>N/A</p> : document.waypoints.map((waypoint) => (
          <article className="waypoint-row" key={waypoint.id}>
            <strong>{waypoint.name || waypoint.id}</strong>
            <span>{waypoint.lat.toFixed(5)}, {waypoint.lon.toFixed(5)}</span>
          </article>
        ))}
      </div>
    </Card>
  );
}

function StructurePill({ label, value, help }: { label: string; value: number; help: string }) {
  return (
    <article className="structure-pill">
      <span>
        {label} <InfoTooltip label={label}>{help}</InfoTooltip>
      </span>
      <strong>{value}</strong>
    </article>
  );
}
