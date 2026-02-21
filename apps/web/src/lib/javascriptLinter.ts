import type { Extension } from "@codemirror/state";
import { lintGutter, linter, type Diagnostic } from "@codemirror/lint";
import { parse } from "acorn";

interface AcornSyntaxError extends SyntaxError {
  pos?: number;
  raisedAt?: number;
  loc?: {
    line: number;
    column: number;
  };
}

function cleanSyntaxMessage(message: string) {
  return message.replace(/\s*\(\d+:\d+\)\s*$/, "").trim();
}

function syntaxDiagnostic(
  docLength: number,
  error: AcornSyntaxError,
): Diagnostic {
  const from = Math.min(Math.max(error.pos ?? 0, 0), Math.max(docLength - 1, 0));
  const raised = error.raisedAt ?? from + 1;
  const to = Math.max(from + 1, Math.min(Math.max(raised, from + 1), docLength));
  const line = error.loc?.line;
  const column = typeof error.loc?.column === "number" ? error.loc.column + 1 : undefined;
  const locationPrefix =
    typeof line === "number" && typeof column === "number"
      ? `Line ${line}, column ${column}: `
      : "";

  return {
    from,
    to,
    severity: "error",
    message: `${locationPrefix}${cleanSyntaxMessage(error.message)}`,
  };
}

export const javascriptSyntaxLinter: Extension = [
  linter(
    (view) => {
      const source = view.state.doc.toString();
      if (!source.trim()) {
        return [];
      }

      try {
        parse(source, {
          ecmaVersion: "latest",
          sourceType: "script",
          allowHashBang: true,
        });
        return [];
      } catch (error) {
        const syntaxError = error as AcornSyntaxError;
        return [syntaxDiagnostic(view.state.doc.length, syntaxError)];
      }
    },
    {
      delay: 5000,
    },
  ),
  lintGutter(),
];
