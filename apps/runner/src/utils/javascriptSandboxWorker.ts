import vm from "vm";
import { parentPort, workerData } from "worker_threads";

interface WorkerInput {
  code: string;
  stdin?: string;
  timeoutMs: number;
  outputLimitBytes: number;
}

interface WorkerOutput {
  ok: boolean;
  output?: string;
  error?: string;
}

const input = workerData as WorkerInput;
const outputLimitBytes = Math.max(1024, Number(input.outputLimitBytes) || 10 * 1024);

let outputBytes = 0;
const lines: string[] = [];

function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function appendLine(line: string) {
  const bytes = Buffer.byteLength(line + "\n");
  outputBytes += bytes;
  if (outputBytes > outputLimitBytes) {
    throw new Error(`Output exceeded ${Math.floor(outputLimitBytes / 1024)}KB limit`);
  }
  lines.push(line);
}

const safeConsole = {
  log: (...args: unknown[]) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
  error: (...args: unknown[]) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
  warn: (...args: unknown[]) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
  info: (...args: unknown[]) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
};

const contextGlobals = {
  console: safeConsole,
  input: String(input.stdin || ""),
  stdin: String(input.stdin || ""),
};

const context = vm.createContext(contextGlobals, {
  name: "job-sandbox",
  codeGeneration: {
    strings: false,
    wasm: false,
  },
});

function send(message: WorkerOutput) {
  parentPort?.postMessage(message);
}

try {
  const script = new vm.Script(String(input.code || ""), {
    filename: "user-code.js",
  });
  script.runInContext(context, {
    timeout: Math.max(1, Number(input.timeoutMs) || 1000),
    displayErrors: true,
    breakOnSigint: false,
  });
  send({
    ok: true,
    output: lines.join("\n"),
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  send({
    ok: false,
    error: message,
  });
}
