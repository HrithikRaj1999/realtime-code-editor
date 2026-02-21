interface StatusDotProps {
  connected: boolean;
  isRunning: boolean;
}

export function StatusDot({ connected, isRunning }: StatusDotProps) {
  const dotClass = !connected ? "bg-red-500" : isRunning ? "bg-amber-400" : "bg-emerald-500";
  const textClass = !connected
    ? "text-red-500"
    : isRunning
      ? "text-amber-400"
      : "text-emerald-500";
  const label = !connected ? "Offline" : isRunning ? "Running" : "Live";

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {connected && !isRunning ? (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40" />
        ) : null}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
      </span>
      <span className={`text-[10px] font-medium ${textClass}`}>{label}</span>
    </div>
  );
}
