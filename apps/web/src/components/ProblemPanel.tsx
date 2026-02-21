import { FileCode2, Lightbulb } from "lucide-react";
import { useState } from "react";
import { PROBLEMS } from "../lib/problems";

type ProblemTab = "description" | "editorial";

export function ProblemPanel() {
  const [activeTab, setActiveTab] = useState<ProblemTab>("description");
  const problem = PROBLEMS[0]; // Default to first problem

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] min-w-0 theme-transition">
      {/* Tab Header */}
      <div className="h-10 border-b border-[var(--border)] flex items-center bg-[var(--bg-hover)]">
        <button
          onClick={() => setActiveTab("description")}
          className={`h-full px-4 text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "description"
              ? "text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-badge)]"
              : "text-[var(--text-faint)] border-transparent hover:text-[var(--text-secondary)]"
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          Description
        </button>
        <button
          onClick={() => setActiveTab("editorial")}
          className={`h-full px-4 text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "editorial"
              ? "text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-badge)]"
              : "text-[var(--text-faint)] border-transparent hover:text-[var(--text-secondary)]"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Editorial
        </button>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto min-w-0">
        {activeTab === "description" ? (
          <div>
            {/* Difficulty Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  problem.difficulty === "Easy"
                    ? "bg-green-500/15 text-green-500"
                    : problem.difficulty === "Medium"
                      ? "bg-yellow-500/15 text-yellow-500"
                      : "bg-red-500/15 text-red-500"
                }`}
              >
                {problem.difficulty}
              </span>
              <span className="text-xs text-[var(--text-faint)]">#{problem.id}</span>
            </div>

            <h2 className="font-bold text-xl mb-4 text-[var(--text-primary)]">{problem.title}</h2>

            <div className="prose prose-sm max-w-none text-[var(--text-secondary)] space-y-4 break-words">
              <p>{problem.description}</p>

              {problem.constraints && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Constraints:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {problem.constraints.map((c, i) => (
                      <li key={i} className="text-[var(--text-muted)]">
                        <code className="text-[var(--accent)] text-xs">{c}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {problem.examples.map((example, i) => (
                <div
                  key={i}
                  className="p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] space-y-2"
                >
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Example {i + 1}
                  </h4>
                  <div className="font-mono text-xs space-y-1">
                    <div>
                      <span className="text-[var(--text-faint)]">Input: </span>
                      <span className="text-blue-400">{example.input}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-faint)]">Output: </span>
                      <span className="text-green-400">{example.output}</span>
                    </div>
                    {example.explanation && (
                      <div className="text-[var(--text-faint)] mt-2 text-xs">
                        <span className="text-[var(--text-muted)]">Explanation: </span>
                        {example.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {problem.tags && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {problem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-xs text-[var(--text-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Approach</h3>
            <p className="text-[var(--text-secondary)]">
              {problem.editorial || "Editorial coming soon..."}
            </p>
            {problem.hint && (
              <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <h4 className="text-yellow-500 text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Hint
                </h4>
                <p className="text-[var(--text-secondary)] text-sm">{problem.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
