import { Loader2, XCircle, Terminal, ChevronRight } from "lucide-react";

interface OutputPanelProps {
  output: string;
  loading?: boolean;
  onClear?: () => void;
}

export function OutputPanel({ output, loading = false, onClear }: OutputPanelProps) {
  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      {/* Mobile-only header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] md:hidden">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-green-500/70" />
          Output
        </span>
        {onClear && output && (
          <button
            onClick={onClear}
            className="text-gray-600 hover:text-gray-400 transition-colors p-1 rounded hover:bg-white/5"
            title="Clear output"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Output body */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-sm scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {loading ? (
          <div className="flex items-center gap-3 text-purple-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium animate-pulse">Executing code...</span>
          </div>
        ) : output ? (
          <div className="space-y-0">
            {output.split("\n").map((line, i) => (
              <div key={i} className="flex gap-2 group">
                <ChevronRight className="w-3 h-3 text-green-600/40 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <pre className="text-green-300/90 whitespace-pre-wrap text-xs leading-relaxed flex-1">
                  {line}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-700">
            <Terminal className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-xs font-medium">No output yet</p>
            <p className="text-[10px] mt-1 text-gray-800">
              Click <span className="text-green-600 font-semibold">Run Code</span> to execute
            </p>
          </div>
        )}
      </div>

      {/* Clear button bar */}
      {output && onClear && (
        <div className="hidden md:flex items-center justify-end px-3 py-1.5 border-t border-white/[0.04]">
          <button
            onClick={onClear}
            className="text-[10px] text-gray-600 hover:text-gray-400 px-2 py-1 rounded hover:bg-white/5 transition-colors flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
