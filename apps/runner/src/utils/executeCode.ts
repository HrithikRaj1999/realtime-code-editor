import path from "path";
import fs from "fs";
import { spawn, spawnSync, ChildProcessWithoutNullStreams } from "child_process";
import { randomUUID } from "crypto";
import { Worker } from "worker_threads";
import { LANGUAGE_MAPPING } from "./languageUtils";

const CODES_DIR = path.join(__dirname, "..", "..", "codes");
const MAX_OUTPUT_BYTES = 10 * 1024;
const SAFE_PATH_DEFAULT = process.platform === "win32" ? "C:\\Windows\\System32" : "/usr/bin:/bin";
const JS_WORKER_FILE_JS = path.join(__dirname, "javascriptSandboxWorker.js");
const JS_WORKER_FILE_TS = path.join(__dirname, "javascriptSandboxWorker.ts");
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 20000;
const MIN_MEMORY_MB = 32;
const MAX_MEMORY_MB = 256;
const COMPILED_LANGUAGE_DEFAULT_TIMEOUT_MS = 12000;

function getDefaultTimeoutMs(language: string): number {
  const normalized = language.toLowerCase();
  switch (normalized) {
    case "go":
    case "java":
    case "cpp":
    case "c":
      return COMPILED_LANGUAGE_DEFAULT_TIMEOUT_MS;
    default:
      return 5000;
  }
}

if (!fs.existsSync(CODES_DIR)) {
  fs.mkdirSync(CODES_DIR, { recursive: true });
}

function stripAnsiCodes(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function isCommandAvailable(command: string) {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, [command], { stdio: "ignore" });
  return result.status === 0;
}

function resolveCommand(candidates: string[], label: string) {
  for (const command of candidates) {
    if (isCommandAvailable(command)) {
      return command;
    }
  }
  throw new Error(`${label} runtime not found. Install it or run the Docker runner.`);
}

interface ProcessOptions {
  command: string;
  args: string[];
  timeoutMs: number;
  stdin?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

function buildSandboxEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  const isWindows = process.platform === "win32";
  const tempRoot =
    process.env.TEMP || process.env.TMP || (isWindows ? "C:\\Windows\\Temp" : "/tmp");
  const homeDir = isWindows
    ? process.env.USERPROFILE || tempRoot
    : process.env.HOME || "/tmp";
  const goCacheDir = path.join(tempRoot, "codestream-go-cache");

  try {
    if (!fs.existsSync(goCacheDir)) {
      fs.mkdirSync(goCacheDir, { recursive: true });
    }
  } catch {
    // Best effort cache setup; execution will fail with a clear runtime error if required.
  }

  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH || SAFE_PATH_DEFAULT,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    HOME: homeDir,
    TMPDIR: tempRoot,
    TEMP: tempRoot,
    TMP: tempRoot,
    GOCACHE: goCacheDir,
    GOMODCACHE: path.join(goCacheDir, "mod"),
    XDG_CACHE_HOME: tempRoot,
  };

  if (isWindows) {
    env.LOCALAPPDATA = process.env.LOCALAPPDATA || tempRoot;
    env.USERPROFILE = homeDir;
  }

  for (const [key, value] of Object.entries(overrides)) {
    env[key] = value;
  }

  return env;
}

function killProcessTree(child: ChildProcessWithoutNullStreams) {
  const { pid } = child;
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // Ignore best-effort cleanup errors.
    }
  }
}

function runProcess({
  command,
  args,
  timeoutMs,
  stdin = "",
  cwd,
  env,
}: ProcessOptions): Promise<string> {
  console.log(`Executing: ${command} ${args.join(" ")} (timeout: ${timeoutMs}ms)`);

  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(command, args, {
      cwd,
      env: env || buildSandboxEnv(),
      detached: process.platform !== "win32",
      stdio: "pipe",
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;

    const settle = (error?: string, value?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      if (error) {
        reject(error);
        return;
      }
      resolve(value || "");
    };

    const terminate = (reason: string) => {
      killProcessTree(child);
      settle(reason);
    };

    const timeoutHandle = setTimeout(() => {
      terminate(`Execution timed out (${timeoutMs}ms limit)`);
    }, timeoutMs);

    const appendOutput = (chunk: Buffer, isStdErr: boolean) => {
      const text = chunk.toString();
      outputBytes += Buffer.byteLength(text);
      if (outputBytes > MAX_OUTPUT_BYTES) {
        terminate(`Output exceeded ${MAX_OUTPUT_BYTES / 1024}KB limit`);
        return;
      }
      if (isStdErr) {
        stderr += text;
      } else {
        stdout += text;
      }
    };

    child.stdout.on("data", (chunk) => {
      appendOutput(chunk as Buffer, false);
    });

    child.stderr.on("data", (chunk) => {
      appendOutput(chunk as Buffer, true);
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.on("error", (error) => {
      settle(error.message);
    });

    child.on("close", (code, signal) => {
      if (settled) {
        return;
      }
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        settle(`Execution terminated by signal ${signal}`);
        return;
      }
      if (code !== 0) {
        settle(stripAnsiCodes(stderr) || `Process exited with code ${code}`);
        return;
      }
      settle(undefined, stripAnsiCodes(stdout || stderr));
    });
  });
}

async function runCompiledLanguage(
  runtimeLabel: string,
  compilerCandidates: string[],
  compileArgs: string[],
  executablePath: string,
  timeoutMs: number,
  stdin: string,
  sourceDir: string,
) {
  const compiler = resolveCommand(compilerCandidates, runtimeLabel);
  await runProcess({
    command: compiler,
    args: compileArgs,
    timeoutMs,
    cwd: sourceDir,
    env: buildSandboxEnv(),
  });

  return runProcess({
    command: executablePath,
    args: [],
    timeoutMs,
    stdin,
    cwd: sourceDir,
    env: buildSandboxEnv(),
  });
}

interface JavaScriptSandboxResult {
  ok: boolean;
  output?: string;
  error?: string;
}

interface WorkerRuntimeOptions {
  filename: string;
  execArgv?: string[];
}

function resolveTsNodeRegisterPath(): string | null {
  const candidates = ["ts-node/register/transpile-only", "ts-node/register"];
  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch {
      // try next candidate
    }
  }
  return null;
}

function resolveJavaScriptWorkerRuntime(): WorkerRuntimeOptions {
  if (fs.existsSync(JS_WORKER_FILE_JS)) {
    return {
      filename: JS_WORKER_FILE_JS,
    };
  }

  if (fs.existsSync(JS_WORKER_FILE_TS)) {
    const tsNodeRegister = resolveTsNodeRegisterPath();
    if (!tsNodeRegister) {
      throw new Error(
        "JavaScript sandbox worker (.ts) found but ts-node register hook is unavailable. Run a build or install ts-node.",
      );
    }

    return {
      filename: JS_WORKER_FILE_TS,
      execArgv: ["-r", tsNodeRegister],
    };
  }

  throw new Error(
    `JavaScript sandbox worker not found. Expected one of: ${JS_WORKER_FILE_JS} or ${JS_WORKER_FILE_TS}`,
  );
}

function runJavaScriptInSandbox(
  filePath: string,
  stdin: string,
  timeoutMs: number,
  memoryMb: number,
): Promise<string> {
  const code = fs.readFileSync(filePath, "utf8");
  const workerRuntime = resolveJavaScriptWorkerRuntime();

  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(workerRuntime.filename, {
      workerData: {
        code,
        stdin,
        timeoutMs,
        outputLimitBytes: MAX_OUTPUT_BYTES,
      },
      execArgv: workerRuntime.execArgv,
      resourceLimits: {
        maxOldGenerationSizeMb: Math.max(32, Math.min(memoryMb, 256)),
      },
    });

    const settle = (error?: string, value?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      worker.removeAllListeners();
      if (error) {
        reject(error);
        return;
      }
      resolve(value || "");
    };

    const timeoutHandle = setTimeout(() => {
      worker
        .terminate()
        .then(() => settle(`Execution timed out (${timeoutMs}ms limit)`))
        .catch(() => settle(`Execution timed out (${timeoutMs}ms limit)`));
    }, timeoutMs + 250);

    worker.on("message", (message: JavaScriptSandboxResult) => {
      if (!message || message.ok !== true) {
        settle(message?.error || "JavaScript sandbox execution failed");
        return;
      }
      settle(undefined, stripAnsiCodes(message.output || ""));
    });

    worker.on("error", (error: Error) => {
      settle(error.message || "JavaScript sandbox worker error");
    });

    worker.on("exit", (code) => {
      if (!settled && code !== 0) {
        settle(
          `JavaScript sandbox exited with code ${code} (possible memory limit hit at ${memoryMb}MB)`,
        );
      }
    });
  });
}

export interface ExecutionOptions {
  stdin?: string;
  timeoutMs?: number;
  memoryMb?: number;
}

export default function executeCode(
  filePath: string,
  language: string,
  options: ExecutionOptions = {},
): Promise<string> {
  const { stdin = "", timeoutMs, memoryMb = 128 } = options;
  const fallbackTimeoutMs = getDefaultTimeoutMs(language);
  const requestedTimeout =
    typeof timeoutMs === "number" && Number.isFinite(timeoutMs)
      ? timeoutMs
      : fallbackTimeoutMs;
  const safeTimeoutMs = Math.min(
    Math.max(Math.floor(requestedTimeout), MIN_TIMEOUT_MS),
    MAX_TIMEOUT_MS,
  );
  const safeMemoryMb = Math.min(
    Math.max(Math.floor(Number.isFinite(memoryMb) ? memoryMb : 128), MIN_MEMORY_MB),
    MAX_MEMORY_MB,
  );
  const lang = language.toLowerCase();
  const fileName = path.basename(filePath, path.extname(filePath));
  const sourceDir = path.dirname(filePath);

  switch (lang) {
    case "javascript": {
      return runJavaScriptInSandbox(filePath, stdin, safeTimeoutMs, safeMemoryMb);
    }
    case "python": {
      const pythonCommand = resolveCommand(["python3", "python", "py"], "Python");
      const args = pythonCommand === "py" ? ["-3", "-I", filePath] : ["-I", filePath];
      return runProcess({
        command: pythonCommand,
        args,
        timeoutMs: safeTimeoutMs,
        stdin,
        cwd: sourceDir,
        env: buildSandboxEnv(),
      });
    }
    case "java": {
      const javacCommand = resolveCommand(["javac"], "Java compiler");
      const javaCommand = resolveCommand(["java"], "Java runtime");
      return runProcess({
        command: javacCommand,
        args: [filePath],
        timeoutMs: safeTimeoutMs,
        cwd: sourceDir,
        env: buildSandboxEnv(),
      }).then(() =>
        runProcess({
          command: javaCommand,
          args: [`-Xmx${safeMemoryMb}m`, "-cp", sourceDir, fileName],
          timeoutMs: safeTimeoutMs,
          stdin,
          cwd: sourceDir,
          env: buildSandboxEnv(),
        }),
      );
    }
    case "cpp": {
      const executablePath = path.join(
        sourceDir,
        `${fileName}${process.platform === "win32" ? ".exe" : ".out"}`,
      );
      return runCompiledLanguage(
        "C++ compiler",
        ["g++", "clang++"],
        [filePath, "-o", executablePath],
        executablePath,
        safeTimeoutMs,
        stdin,
        sourceDir,
      );
    }
    case "c": {
      const executablePath = path.join(
        sourceDir,
        `${fileName}${process.platform === "win32" ? ".exe" : ".out"}`,
      );
      return runCompiledLanguage(
        "C compiler",
        ["gcc", "clang"],
        [filePath, "-o", executablePath],
        executablePath,
        safeTimeoutMs,
        stdin,
        sourceDir,
      );
    }
    case "go": {
      const goCommand = resolveCommand(["go"], "Go");
      const executablePath = path.join(
        sourceDir,
        `${fileName}${process.platform === "win32" ? ".exe" : ".out"}`,
      );
      return runProcess({
        command: goCommand,
        args: ["build", "-o", executablePath, filePath],
        timeoutMs: safeTimeoutMs,
        cwd: sourceDir,
        env: buildSandboxEnv(),
      }).then(() =>
        runProcess({
          command: executablePath,
          args: [],
          timeoutMs: safeTimeoutMs,
          stdin,
          cwd: sourceDir,
          env: buildSandboxEnv(),
        }),
      );
    }
    default: {
      throw new Error(`Unsupported language: ${language}`);
    }
  }
}

export const writeCodeToFile = async (language: string, code: string): Promise<string> => {
  const config = LANGUAGE_MAPPING[language.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const jobDir = path.join(CODES_DIR, randomUUID());
  await fs.promises.mkdir(jobDir, { recursive: true });

  const fileName = language.toLowerCase() === "java" ? "Main" : randomUUID();
  const filePath = path.join(jobDir, `${fileName}.${config.extension}`);
  await fs.promises.writeFile(filePath, code, "utf8");

  return filePath;
};

export async function cleanupCodeArtifacts(filePath: string): Promise<void> {
  const jobDir = path.dirname(filePath);
  const retryableCodes = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.promises.rm(jobDir, { recursive: true, force: true });
      return;
    } catch (error: any) {
      const code = error?.code;
      if (!retryableCodes.has(code) || attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 80));
    }
  }
}
