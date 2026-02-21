import { ZoomIn, ZoomOut } from "lucide-react";

interface ZoomControlsProps {
  size: number;
  onIn: () => void;
  onOut: () => void;
}

export function ZoomControls({ size, onIn, onOut }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-0.5">
      <button
        onClick={onOut}
        className="p-1 text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <span className="w-6 text-center text-[10px] font-mono text-[var(--text-faint)] select-none">
        {size}
      </span>
      <button
        onClick={onIn}
        className="p-1 text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
