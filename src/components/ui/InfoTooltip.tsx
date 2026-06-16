interface InfoTooltipProps {
  label: string;
  children: string;
}

export function InfoTooltip({ label, children }: InfoTooltipProps) {
  return (
    <span className="info-tooltip" tabIndex={0} aria-label={`${label}: ${children}`}>
      <span aria-hidden="true">?</span>
      <span className="info-tooltip__content" role="tooltip">
        {children}
      </span>
    </span>
  );
}
