import { useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { EditorView } from "@codemirror/view";
import { indentRange } from "@codemirror/language";
import { formatCodeByLanguage } from "../lib/formatters";

export interface FormatResult {
  ok: boolean;
  changed: boolean;
  message: string;
}

export interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
  formatSignal?: number;
  onFormatComplete?: (result: FormatResult) => void;
}

export function CodeEditor({
  code,
  setCode,
  language,
  formatSignal = 0,
  onFormatComplete,
}: CodeEditorProps) {
  const editorRef = useRef<EditorView | null>(null);
  const latestCodeRef = useRef(code);

  useEffect(() => {
    latestCodeRef.current = code;
  }, [code]);

  const getExtensions = () => {
    switch (language) {
      case "javascript":
      case "js":
        return [javascript()];
      case "python":
      case "py":
        return [python()];
      case "java":
        return [java()];
      case "cpp":
      case "c":
        return [cpp()];
      case "go":
        // CodeMirror doesn't have a direct 'go' package in the main repo, using cpp/default for now or standard text
        return [cpp()]; // Fallback or install @codemirror/lang-go if needed
      default:
        return [javascript()];
    }
  };

  useEffect(() => {
    if (!formatSignal) {
      return;
    }

    let cancelled = false;

    const runFormat = async () => {
      try {
        const lowerLanguage = language.toLowerCase();
        const originalCode = latestCodeRef.current;
        let formatted = originalCode;

        if (lowerLanguage === "javascript" || lowerLanguage === "js") {
          formatted = await formatCodeByLanguage(originalCode, language);
        } else if (editorRef.current) {
          const view = editorRef.current;
          const changes = indentRange(view.state, 0, view.state.doc.length);
          if (!changes.empty) {
            view.dispatch({ changes });
          }
          formatted = await formatCodeByLanguage(view.state.doc.toString(), language);
        } else {
          formatted = await formatCodeByLanguage(originalCode, language);
        }

        if (cancelled) {
          return;
        }

        const changed = formatted !== originalCode;
        if (changed) {
          setCode(formatted);
        }

        onFormatComplete?.({
          ok: true,
          changed,
          message: changed ? "Code formatted successfully." : "Code is already formatted.",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        onFormatComplete?.({
          ok: false,
          changed: false,
          message: error instanceof Error ? error.message : "Failed to format code.",
        });
      }
    };

    void runFormat();

    return () => {
      cancelled = true;
    };
  }, [formatSignal, language, onFormatComplete, setCode]);

  return (
    <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
      <CodeMirror
        value={code}
        height="100%"
        theme={vscodeDark}
        extensions={getExtensions()}
        onChange={(value) => setCode(value)}
        onCreateEditor={(view) => {
          editorRef.current = view;
        }}
        className="h-full text-base"
      />
    </div>
  );
}
