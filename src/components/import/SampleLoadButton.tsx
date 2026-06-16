export interface GpxSampleOption {
  id: string;
  label: string;
  filename: string;
}

interface SampleLoadButtonProps {
  samples: GpxSampleOption[];
  onLoad: (sample: GpxSampleOption) => void;
  disabled?: boolean;
}

export function SampleLoadButton({ samples, onLoad, disabled }: SampleLoadButtonProps) {
  return (
    <div className="sample-actions" aria-label="Bundled GPX samples">
      {samples.map((sample) => (
        <button className="button button--secondary" type="button" onClick={() => onLoad(sample)} disabled={disabled} key={sample.id}>
          {sample.label}
        </button>
      ))}
    </div>
  );
}
