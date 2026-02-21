const vm = require("vm");
const { parentPort, workerData } = require("worker_threads");

const input = workerData || {};
const outputLimitBytes = Math.max(1024, Number(input.outputLimitBytes) || 10 * 1024);

let outputBytes = 0;
const lines = [];

function stringifyValue(value) {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function appendLine(line) {
  const bytes = Buffer.byteLength(`${line}\n`);
  outputBytes += bytes;
  if (outputBytes > outputLimitBytes) {
    throw new Error(`Output exceeded ${Math.floor(outputLimitBytes / 1024)}KB limit`);
  }
  lines.push(line);
}

const safeConsole = {
  log: (...args) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
  error: (...args) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
  warn: (...args) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
  info: (...args) => appendLine(args.map((arg) => stringifyValue(arg)).join(" ")),
};

const context = vm.createContext(
  {
    console: safeConsole,
    input: String(input.stdin || ""),
    stdin: String(input.stdin || ""),
  },
  {
    name: "job-sandbox",
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  },
);

function send(message) {
  if (parentPort) {
    parentPort.postMessage(message);
  }
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
  send({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
}
