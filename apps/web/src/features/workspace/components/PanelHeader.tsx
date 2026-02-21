interface PanelHeaderProps {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
}

export function PanelHeader({ icon, label, right }: PanelHeaderProps) {
  return (
    <div className="h-9 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0 theme-transition">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {icon}
        {label}
      </span>
      {right ? <div className="flex items-center gap-1.5">{right}</div> : null}
    </div>
  );
}
