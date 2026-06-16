import { useMemo, useRef, useState } from 'react';
import { EmptyState } from './components/common/EmptyState';
import { ErrorState } from './components/common/ErrorState';
import { LoadingState } from './components/common/LoadingState';
import { ActivityCharts, type DistanceRange } from './components/charts/ActivityCharts';
import { RacePlanner } from './components/race/RacePlanner';
import { ExportReportButton } from './components/export/ExportReportButton';
import { EntityBreakdown } from './components/details/EntityBreakdown';
import { ImportPanel } from './components/import/ImportPanel';
import type { GpxSampleOption } from './components/import/SampleLoadButton';
import { ActivityMap } from './components/map/ActivityMap';
import { SummaryCards } from './components/summary/SummaryCards';
import { buildActivitySeries } from './lib/gpx/activitySeries';
import { analyzeCourse } from './lib/gpx/courseAnalysis';
import { parseGpx } from './lib/gpx/parseGpx';
import { deriveStats } from './lib/gpx/deriveStats';
import { toRenderModel } from './lib/gpx/toRenderModel';
import type { GpxDiagnostic, GpxDocument } from './lib/gpx/types';
import { readBundledSampleGpx, readLocalGpx } from './lib/io/readLocalGpx';


const GPX_SAMPLES: GpxSampleOption[] = [
  { id: 'demo', label: 'Load demo', filename: 'demo.gpx' },
  { id: 'wonju-35k', label: 'Load 35K sample', filename: 'wonju-mammut-35k.gpx' },
];

interface AppState {
  status: 'empty' | 'loading' | 'ready' | 'error';
  sourceName?: string;
  document?: GpxDocument;
  diagnostics: GpxDiagnostic[];
}

export default function App() {
  const [state, setState] = useState<AppState>({ status: 'empty', diagnostics: [] });
  const [selectedRange, setSelectedRange] = useState<DistanceRange | undefined>();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const stats = useMemo(() => (state.document ? deriveStats(state.document) : undefined), [state.document]);
  const renderModel = useMemo(() => (state.document ? toRenderModel(state.document) : undefined), [state.document]);
  const activitySeries = useMemo(() => (state.document ? buildActivitySeries(state.document) : []), [state.document]);
  const courseAnalysis = useMemo(() => (state.document ? analyzeCourse(state.document, activitySeries) : undefined), [activitySeries, state.document]);

  async function loadFile(file: File) {
    setSelectedRange(undefined);
    setState((current) => ({ ...current, status: 'loading', sourceName: file.name, diagnostics: [] }));
    const readResult = await readLocalGpx(file);
    consumeReadResult(readResult.text, readResult.filename, readResult.diagnostics);
  }

  async function loadSample(sample: GpxSampleOption) {
    setSelectedRange(undefined);
    setState((current) => ({ ...current, status: 'loading', sourceName: sample.filename, diagnostics: [] }));
    const readResult = await readBundledSampleGpx(sample.filename);
    consumeReadResult(readResult.text, readResult.filename, readResult.diagnostics);
  }

  function consumeReadResult(text: string | undefined, filename: string | undefined, readDiagnostics: GpxDiagnostic[]) {
    if (!text) {
      setState({ status: 'error', sourceName: filename, diagnostics: readDiagnostics });
      return;
    }

    const parsed = parseGpx(text);
    const diagnostics = [...readDiagnostics, ...parsed.diagnostics];
    if (!parsed.ok) {
      setState({ status: 'error', sourceName: filename, diagnostics });
      return;
    }

    setState({ status: 'ready', sourceName: filename, document: parsed.document, diagnostics });
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Local-first GPX Reader</p>
        <h1>GPX 활동 경로를 브라우저에서 확인하세요.</h1>
        <p>Track, route, waypoint, segment 구조를 보존해 지도와 기본 통계로 보여주는 MVP입니다.</p>
      </header>

      <ImportPanel onFile={loadFile} onSample={loadSample} samples={GPX_SAMPLES} busy={state.status === 'loading'} sourceName={state.sourceName} />

      {state.status === 'ready' ? (
        <div className="export-toolbar">
          <ExportReportButton targetRef={reportRef} filename={`gpx-race-report-${state.sourceName ?? 'activity'}.png`} />
          <p>지도 타일은 가능하면 포함하고, 차트는 PNG로 안정화해 리포트를 저장합니다.</p>
        </div>
      ) : null}

      {state.status === 'empty' ? <EmptyState /> : null}
      {state.status === 'loading' ? <LoadingState /> : null}
      {state.status === 'error' ? <ErrorState diagnostics={state.diagnostics} /> : null}

      {state.status === 'ready' && state.document && stats && renderModel ? (
        <div className="workspace" ref={reportRef}>
          <div className="primary-column">
            <ActivityMap model={renderModel} analysis={courseAnalysis} selectedRange={selectedRange} />
            <ActivityCharts samples={activitySeries} elevation={stats.elevation} courseSegments={courseAnalysis?.segments} selectedRange={selectedRange} onSelectedRangeChange={setSelectedRange} />
            {courseAnalysis ? <RacePlanner analysis={courseAnalysis} /> : null}
            {state.diagnostics.length > 0 ? <ErrorState title="읽기 참고 사항" diagnostics={state.diagnostics} /> : null}
          </div>
          <aside className="side-column">
            <SummaryCards stats={stats} />
            <EntityBreakdown document={state.document} />
          </aside>
        </div>
      ) : null}
    </main>
  );
}
