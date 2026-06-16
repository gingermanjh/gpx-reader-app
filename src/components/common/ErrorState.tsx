import type { GpxDiagnostic } from '../../lib/gpx/types';

interface ErrorStateProps {
  title?: string;
  diagnostics: GpxDiagnostic[];
}

export function ErrorState({ title = 'GPX를 읽지 못했습니다', diagnostics }: ErrorStateProps) {
  return (
    <section className="state-card state-card--error" role="alert">
      <h2>{title}</h2>
      <ul>
        {diagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}-${index}`}>
            <strong>{diagnostic.code}</strong>: {diagnostic.message}
            {diagnostic.path ? <span className="path"> ({diagnostic.path})</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
