interface SampleLoadButtonProps {
  onLoad: () => void;
  disabled?: boolean;
}

export function SampleLoadButton({ onLoad, disabled }: SampleLoadButtonProps) {
  return (
    <button className="button button--secondary" type="button" onClick={onLoad} disabled={disabled}>
      Load demo
    </button>
  );
}
