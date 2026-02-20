import path from "path";
import fs from "fs";
import { spawn, spawnSync } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { LANGUAGE_MAPPING } from "./languageUtils";

const OUTPUT_DIR = path.join(__dirname, "..", "..", "output");
const CODES_DIR = path.join(__dirname, "..", "..", "codes");
const MAX_OUTPUT_BYTES = 10 * 1024;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
    const child = spawn(command, args, {
      cwd,
      env,
      timeout: timeoutMs,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_OUTPUT_BYTES) {
        child.kill("SIGTERM");
        reject(`Output exceeded ${MAX_OUTPUT_BYTES / 1024}KB limit`);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.on("error", (error) => {
      reject(error.message);
    });

    child.on("close", (code, signal) => {
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        reject(`Execution timed out (${timeoutMs}ms limit)`);
        return;
      }
      if (code !== 0) {
        reject(stderr || `Process exited with code ${code}`);
        return;
      }
      resolve(stripAnsiCodes(stdout));
    });
  });
}

async function runCompiledLanguage(
  compilerCandidates: string[],
  compileArgs: string[],
  executablePath: string,
  timeoutMs: number,
  stdin: string,
) {
  const compiler = resolveCommand(compilerCandidates, "Compiler");
  await runProcess({
    command: compiler,
    args: compileArgs,
    timeoutMs,
  });

  return runProcess({
    command: executablePath,
    args: [],
    timeoutMs,
    stdin,
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
  const { stdin = "", timeoutMs = 5000, memoryMb = 128 } = options;
  const lang = language.toLowerCase();
  const fileName = path.basename(filePath, path.extname(filePath));
  const sourceDir = path.dirname(filePath);

  switch (lang) {
    case "javascript": {
      const nodeCommand = resolveCommand(["node"], "Node.js");
      return runProcess({
        command: nodeCommand,
        args: [filePath],
        timeoutMs,
        stdin,
        env: {
          ...process.env,
          NODE_OPTIONS: `--max-old-space-size=${memoryMb}`,
        },
      });
    }
    case "python": {
      const pythonCommand = resolveCommand(["python3", "python", "py"], "Python");
      const args = pythonCommand === "py" ? ["-3", filePath] : [filePath];
      return runProcess({
        command: pythonCommand,
        args,
        timeoutMs,
        stdin,
      });
    }
    case "java": {
      const javacCommand = resolveCommand(["javac"], "Java compiler");
      const javaCommand = resolveCommand(["java"], "Java runtime");
      return runProcess({
        command: javacCommand,
        args: [filePath],
        timeoutMs,
        cwd: sourceDir,
      }).then(() =>
        runProcess({
          command: javaCommand,
          args: ["-cp", sourceDir, fileName],
          timeoutMs,
          stdin,
          cwd: sourceDir,
        }),
      );
    }
    case "cpp": {
      const executablePath = path.join(
        OUTPUT_DIR,
        `${fileName}${process.platform === "win32" ? ".exe" : ".out"}`,
      );
      return runCompiledLanguage(
        ["g++", "clang++"],
        [filePath, "-o", executablePath],
        executablePath,
        timeoutMs,
        stdin,
      );
    }
    case "c": {
      const executablePath = path.join(
        OUTPUT_DIR,
        `${fileName}${process.platform === "win32" ? ".exe" : ".out"}`,
      );
      return runCompiledLanguage(
        ["gcc", "clang"],
        [filePath, "-o", executablePath],
        executablePath,
        timeoutMs,
        stdin,
      );
    }
    case "go": {
      const goCommand = resolveCommand(["go"], "Go");
      return runProcess({
        command: goCommand,
        args: ["run", filePath],
        timeoutMs,
        stdin,
      });
    }
    default: {
      const nodeCommand = resolveCommand(["node"], "Node.js");
      return runProcess({
        command: nodeCommand,
        args: [filePath],
        timeoutMs,
        stdin,
      });
    }
  }
}

export const writeCodeToFile = async (language: string, code: string): Promise<string> => {
  const config = LANGUAGE_MAPPING[language.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const jobDir = path.join(CODES_DIR, uuidv4());
  await fs.promises.mkdir(jobDir, { recursive: true });

  const fileName = language.toLowerCase() === "java" ? "Main" : uuidv4();
  const filePath = path.join(jobDir, `${fileName}.${config.extension}`);
  await fs.promises.writeFile(filePath, code);

  return filePath;
};
