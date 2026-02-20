import { FileCode2, Lightbulb } from "lucide-react";
import { useState } from "react";
import { PROBLEMS } from "../lib/problems";

type ProblemTab = "description" | "editorial";

export function ProblemPanel() {
  const [activeTab, setActiveTab] = useState<ProblemTab>("description");
  const problem = PROBLEMS[0]; // Default to first problem

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] min-w-0">
      {/* Tab Header */}
      <div className="h-10 border-b border-white/10 flex items-center bg-white/5">
        <button
          onClick={() => setActiveTab("description")}
          className={`h-full px-4 text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "description"
              ? "text-purple-400 border-purple-400 bg-white/5"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          Description
        </button>
        <button
          onClick={() => setActiveTab("editorial")}
          className={`h-full px-4 text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "editorial"
              ? "text-purple-400 border-purple-400 bg-white/5"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Editorial
        </button>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-w-0">
        {activeTab === "description" ? (
          <div>
            {/* Difficulty Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  problem.difficulty === "Easy"
                    ? "bg-green-500/15 text-green-400"
                    : problem.difficulty === "Medium"
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-red-500/15 text-red-400"
                }`}
              >
                {problem.difficulty}
              </span>
              <span className="text-xs text-gray-500">#{problem.id}</span>
            </div>

            <h2 className="font-bold text-xl mb-4 text-white">{problem.title}</h2>

            <div className="prose prose-invert prose-sm max-w-none text-gray-400 space-y-4 break-words">
              <p>{problem.description}</p>

              {problem.constraints && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Constraints:</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {problem.constraints.map((c, i) => (
                      <li key={i} className="text-gray-500">
                        <code className="text-purple-300 text-xs">{c}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {problem.examples.map((example, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Example {i + 1}
                  </h4>
                  <div className="font-mono text-xs space-y-1">
                    <div>
                      <span className="text-gray-500">Input: </span>
                      <span className="text-blue-300">{example.input}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Output: </span>
                      <span className="text-green-300">{example.output}</span>
                    </div>
                    {example.explanation && (
                      <div className="text-gray-500 mt-2 text-xs">
                        <span className="text-gray-400">Explanation: </span>
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
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <h3 className="text-lg font-bold text-white mb-4">Approach</h3>
            <p className="text-gray-400">{problem.editorial || "Editorial coming soon..."}</p>
            {problem.hint && (
              <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <h4 className="text-yellow-400 text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Hint
                </h4>
                <p className="text-gray-400 text-sm">{problem.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
