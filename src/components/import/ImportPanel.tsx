import { useRef, useState, type DragEvent } from 'react';
import { SampleLoadButton, type GpxSampleOption } from './SampleLoadButton';

interface ImportPanelProps {
  onFile: (file: File) => void;
  onSample: (sample: GpxSampleOption) => void;
  samples: GpxSampleOption[];
  busy?: boolean;
  sourceName?: string;
}

export function ImportPanel({ onFile, onSample, samples, busy, sourceName }: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files.item(0);
    if (file) onFile(file);
  }

  return (
    <section
      className={`import-panel ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div>
        <p className="eyebrow">Import</p>
        <h2>로컬 GPX 파일을 선택하거나 드래그하세요.</h2>
        <p className="privacy-copy">GPX stays in your browser; map tiles may be requested from the tile provider.</p>
        {sourceName ? <p className="source-name">현재 파일: {sourceName}</p> : null}
      </div>
      <div className="import-actions">
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.item(0);
            if (file) onFile(file);
            event.currentTarget.value = '';
          }}
        />
        <button className="button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          Choose GPX
        </button>
        <SampleLoadButton samples={samples} onLoad={onSample} disabled={busy} />
      </div>
    </section>
  );
}
