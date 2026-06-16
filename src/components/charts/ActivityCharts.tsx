import { area, extent, line, max, scaleLinear } from 'd3';
import { useMemo, useState, type MouseEvent, type PointerEvent } from 'react';
import type { ActivitySample } from '../../lib/gpx/activitySeries';
import type { CourseSegment } from '../../lib/gpx/courseAnalysis';
import type { ElevationStats } from '../../lib/gpx/types';

export interface DistanceRange {
  startDistanceMeters: number;
  endDistanceMeters: number;
}

interface ActivityChartsProps {
  samples: ActivitySample[];
  elevation: ElevationStats;
  courseSegments?: CourseSegment[];
  selectedRange?: DistanceRange;
  onSelectedRangeChange?: (range: DistanceRange | undefined) => void;
}

interface ChartDatum extends ActivitySample {
  value?: number;
}

interface ProfileChartProps {
  title: string;
  subtitle: string;
  unit: string;
  color: string;
  data: ChartDatum[];
  summary?: string;
  highlightSegments?: CourseSegment[];
  selectedRange?: DistanceRange;
  onSelectedRangeChange?: (range: DistanceRange | undefined) => void;
  enableBrush?: boolean;
}

const WIDTH = 860;
const HEIGHT = 280;
const MARGIN = { top: 34, right: 26, bottom: 46, left: 58 };

export function ActivityCharts({ samples, elevation, courseSegments = [], selectedRange, onSelectedRangeChange }: ActivityChartsProps) {
  const elevationData = samples.map((sample) => ({ ...sample, value: sample.ele }));
  const speedData = samples.map((sample) => ({ ...sample, value: sample.speedKph }));
  const hasElevation = elevationData.some((sample) => sample.value !== undefined);
  const hasSpeed = speedData.some((sample) => sample.value !== undefined);

  if (!hasElevation && !hasSpeed) {
    return (
      <section className="charts-card">
        <h2>Activity visualizations</h2>
        <p>이 GPX에는 고도나 시간 정보가 부족해서 고도/속도 그래프를 만들 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="charts-card" aria-label="Activity visualizations">
      <div className="charts-header">
        <div>
          <p className="eyebrow">D3 visualizations</p>
          <h2>고도와 이동 속도 변화</h2>
        </div>
        <p>거리 누적값을 기준으로 GPX 트랙포인트의 고도와 구간 속도를 시각화합니다.</p>
      </div>
      <div className="charts-grid">
        {hasElevation ? (
          <ProfileChart
            title="Elevation profile"
            subtitle="누적 거리별 고도 변화"
            summary={formatCumulativeElevation(elevation)}
            highlightSegments={courseSegments.filter((segment) => segment.kind !== 'flat')}
            selectedRange={selectedRange}
            onSelectedRangeChange={onSelectedRangeChange}
            enableBrush
            unit="m"
            color="#2563eb"
            data={elevationData}
          />
        ) : null}
        {hasSpeed ? (
          <ProfileChart
            title="Speed profile"
            subtitle="트랙포인트 사이 계산 속도"
            unit="km/h"
            color="#16a34a"
            data={speedData}
          />
        ) : null}
      </div>
    </section>
  );
}

function ProfileChart({ title, subtitle, unit, color, data, summary, highlightSegments = [], selectedRange, onSelectedRangeChange, enableBrush = false }: ProfileChartProps) {
  const [hover, setHover] = useState<ChartDatum | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const definedData = useMemo(
    () => data.filter((sample) => sample.value !== undefined && Number.isFinite(sample.value)),
    [data],
  );
  const xMax = Math.max(1, max(data, (sample) => sample.distanceMeters) ?? 1);
  const [rawMin = 0, rawMax = 1] = extent(definedData, (sample) => sample.value ?? 0);
  const yPadding = Math.max(1, (rawMax - rawMin) * 0.12);
  const yMin = Math.floor(rawMin - yPadding);
  const yMax = Math.ceil(rawMax + yPadding);

  const xDomain: [number, number] = selectedRange ? [selectedRange.startDistanceMeters, selectedRange.endDistanceMeters] : [0, xMax];

  const x = scaleLinear().domain(xDomain).range([MARGIN.left, MARGIN.left + plotWidth]);
  const y = scaleLinear().domain([yMin, yMax]).range([MARGIN.top + plotHeight, MARGIN.top]);
  const visibleData = data.filter((sample) => sample.distanceMeters >= xDomain[0] && sample.distanceMeters <= xDomain[1]);

  const linePath = line<ChartDatum>()
    .defined((sample) => sample.value !== undefined && Number.isFinite(sample.value))
    .x((sample) => x(sample.distanceMeters))
    .y((sample) => y(sample.value ?? 0))(visibleData);

  const areaPath = area<ChartDatum>()
    .defined((sample) => sample.value !== undefined && Number.isFinite(sample.value))
    .x((sample) => x(sample.distanceMeters))
    .y0(y(yMin))
    .y1((sample) => y(sample.value ?? yMin))(visibleData);

  const xTicks = x.ticks(5);
  const yTicks = y.ticks(4);
  const latest = definedData[definedData.length - 1];
  const peak = definedData.reduce((current, sample) => ((sample.value ?? -Infinity) > (current.value ?? -Infinity) ? sample : current), definedData[0]);
  const valley = definedData.reduce((current, sample) => ((sample.value ?? Infinity) < (current.value ?? Infinity) ? sample : current), definedData[0]);
  const active = hover ?? null;
  const displayedPoint = active ?? latest;
  const draftRange = dragStartX !== null && dragCurrentX !== null
    ? [Math.min(dragStartX, dragCurrentX), Math.max(dragStartX, dragCurrentX)] as const
    : undefined;

  function svgXFromPointer(event: PointerEvent<SVGSVGElement | SVGRectElement> | MouseEvent<SVGSVGElement | SVGRectElement>): number {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * WIDTH;
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>) {
    if (definedData.length === 0) return;
    const svgX = svgXFromPointer(event);
    if (dragStartX !== null) setDragCurrentX(Math.max(MARGIN.left, Math.min(MARGIN.left + plotWidth, svgX)));
    const distance = x.invert(Math.max(MARGIN.left, Math.min(MARGIN.left + plotWidth, svgX)));
    const nearest = definedData.reduce((current, sample) =>
      Math.abs(sample.distanceMeters - distance) < Math.abs(current.distanceMeters - distance) ? sample : current,
    );
    setHover(nearest);
  }

  function handleBrushStart(event: PointerEvent<SVGSVGElement | SVGRectElement> | MouseEvent<SVGSVGElement | SVGRectElement>) {
    if (!enableBrush) return;
    const svgX = Math.max(MARGIN.left, Math.min(MARGIN.left + plotWidth, svgXFromPointer(event)));
    setDragStartX(svgX);
    setDragCurrentX(svgX);
  }

  function handleBrushEnd() {
    if (!enableBrush || dragStartX === null || dragCurrentX === null) return;
    const start = x.invert(Math.min(dragStartX, dragCurrentX));
    const end = x.invert(Math.max(dragStartX, dragCurrentX));
    setDragStartX(null);
    setDragCurrentX(null);
    if (Math.abs(end - start) < Math.max(20, xMax * 0.01)) return;
    onSelectedRangeChange?.({ startDistanceMeters: Math.min(start, end), endDistanceMeters: Math.max(start, end) });
  }

  return (
    <article className="chart-panel">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
          {summary ? <p className="chart-summary">{summary}</p> : null}
          {enableBrush ? <p className="chart-brush-help">그래프를 드래그하면 해당 거리 구간으로 확대되고 지도에서도 노란색으로 강조됩니다.</p> : null}
        </div>
        <div className="chart-header-actions">
          <div className="chart-current-value" aria-label={`${title} displayed point value`}>
            <span>{active ? '선택 지점' : '마지막 지점'}</span>
            <strong>{formatValue(displayedPoint?.value, unit)}</strong>
          </div>
          {enableBrush ? (
            <button className="button button--tiny" type="button" onClick={() => onSelectedRangeChange?.(undefined)} disabled={!selectedRange}>
              Reset zoom
            </button>
          ) : null}
        </div>
      </header>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title} chart`}
        onPointerMove={handlePointerMove}
        onMouseMove={handlePointerMove}
        onPointerDown={handleBrushStart}
        onMouseDown={handleBrushStart}
        onPointerUp={handleBrushEnd}
        onMouseUp={handleBrushEnd}
        onPointerCancel={handleBrushEnd}
        onPointerLeave={() => setHover(null)}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${title.replaceAll(' ', '-')}-gradient`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="24" className="chart-bg" />
        {highlightSegments.map((segment) => (
          <rect
            key={segment.id}
            x={x(segment.startDistanceMeters)}
            y={MARGIN.top}
            width={Math.max(2, x(segment.endDistanceMeters) - x(segment.startDistanceMeters))}
            height={plotHeight}
            className={`chart-segment-highlight chart-segment-highlight--${segment.kind}`}
          />
        ))}
        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line x1={x(tick)} x2={x(tick)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className="chart-grid-line" />
            <text x={x(tick)} y={HEIGHT - 16} textAnchor="middle" className="chart-tick">
              {(tick / 1000).toFixed(xMax > 10_000 ? 0 : 1)} km
            </text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(tick)} y2={y(tick)} className="chart-grid-line" />
            <text x={MARGIN.left - 10} y={y(tick) + 4} textAnchor="end" className="chart-tick">
              {Math.round(tick)} {unit}
            </text>
          </g>
        ))}
        {areaPath ? <path d={areaPath} fill={`url(#${title.replaceAll(' ', '-')}-gradient)`} /> : null}
        {linePath ? <path d={linePath} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {valley ? <ExtremaMarker sample={valley} label="min" color="#0f172a" x={x} y={y} unit={unit} offset={18} /> : null}
        {peak ? <ExtremaMarker sample={peak} label="max" color={color} x={x} y={y} unit={unit} offset={-14} /> : null}
        {active ? (
          <g className="chart-hover">
            <line x1={x(active.distanceMeters)} x2={x(active.distanceMeters)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} />
            <circle cx={x(active.distanceMeters)} cy={y(active.value ?? 0)} r="6" fill="#111827" stroke="white" strokeWidth="3" />
            <g transform={`translate(${Math.min(WIDTH - 205, Math.max(70, x(active.distanceMeters) + 12))},${Math.max(42, y(active.value ?? 0) - 46)})`}>
              <rect width="170" height="42" rx="12" />
              <text x="12" y="17">{formatValue(active.value, unit)}</text>
              <text x="12" y="33">{(active.distanceMeters / 1000).toFixed(2)} km</text>
            </g>
          </g>
        ) : null}
        {selectedRange ? (
          <rect
            x={x(selectedRange.startDistanceMeters)}
            y={MARGIN.top}
            width={Math.max(2, x(selectedRange.endDistanceMeters) - x(selectedRange.startDistanceMeters))}
            height={plotHeight}
            className="chart-selected-range"
          />
        ) : null}
        {draftRange ? (
          <rect
            x={draftRange[0]}
            y={MARGIN.top}
            width={Math.max(2, draftRange[1] - draftRange[0])}
            height={plotHeight}
            className="chart-brush-draft"
          />
        ) : null}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          className="chart-hitbox"
        />
      </svg>
    </article>
  );
}

function ExtremaMarker({
  sample,
  label,
  color,
  x,
  y,
  unit,
  offset,
}: {
  sample: ChartDatum;
  label: string;
  color: string;
  x: (value: number) => number;
  y: (value: number) => number;
  unit: string;
  offset: number;
}) {
  const value = sample.value ?? 0;
  return (
    <g>
      <circle cx={x(sample.distanceMeters)} cy={y(value)} r="5" fill={color} stroke="white" strokeWidth="3" />
      <text x={x(sample.distanceMeters)} y={Math.max(18, Math.min(HEIGHT - 12, y(value) + offset))} textAnchor="middle" className="chart-annotation">
        {label} {formatValue(sample.value, unit)}
      </text>
    </g>
  );
}

function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined || !Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(unit === 'm' ? 0 : 1)} ${unit}`;
}

function formatCumulativeElevation(elevation: ElevationStats): string {
  if (elevation.min === undefined || elevation.max === undefined) return '누적 상승/누적 하강 데이터 없음';
  return `누적 상승 +${Math.round(elevation.gain ?? 0)} m · 누적 하강 -${Math.round(elevation.loss ?? 0)} m`;
}
