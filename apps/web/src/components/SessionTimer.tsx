import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export function SessionTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const format = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <span
      className="flex items-center gap-1 cursor-pointer hover:text-gray-300 transition-colors"
      onClick={() => setIsRunning(!isRunning)}
      title={isRunning ? "Pause timer" : "Resume timer"}
    >
      <Clock className="w-3 h-3" />
      {format(seconds)}
    </span>
  );
}
