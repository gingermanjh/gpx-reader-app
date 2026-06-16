interface MapLegendProps {
  tileUnavailable?: boolean;
}

export function MapLegend({ tileUnavailable }: MapLegendProps) {
  return (
    <aside className="map-legend">
      <span><i className="legend-line legend-line--steep-climb" /> 급오르막</span>
      <span><i className="legend-line legend-line--climb" /> 오르막</span>
      <span><i className="legend-line legend-line--flat" /> 평지</span>
      <span><i className="legend-line legend-line--descent" /> 내리막</span>
      <span><i className="legend-line legend-line--route" /> Route</span>
      <span><i className="legend-dot" /> Waypoints</span>
      {tileUnavailable ? <strong>Tile unavailable: vector fallback active</strong> : null}
    </aside>
  );
}
