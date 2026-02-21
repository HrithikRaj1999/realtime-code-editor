import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const executeCodeModulePath = path.join(__dirname, "..", "dist", "utils", "executeCode.js");

if (!fs.existsSync(executeCodeModulePath)) {
  throw new Error(
    `Missing compiled executeCode module at ${executeCodeModulePath}. Run "npm run build" before running tests.`,
  );
}

const executeCodeModule = require(executeCodeModulePath);
const executeCode = executeCodeModule.default;
const writeCodeToFile = executeCodeModule.writeCodeToFile;
const cleanupCodeArtifacts = executeCodeModule.cleanupCodeArtifacts;

function hasCommand(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, [command], { stdio: "ignore" });
  return result.status === 0;
}

function hasAny(commands) {
  return commands.some((command) => hasCommand(command));
}

function isLanguageAvailable(language) {
  switch (language) {
    case "javascript":
      return hasCommand("node");
    case "python":
      return hasAny(["python3", "python", "py"]);
    case "java":
      return hasCommand("javac") && hasCommand("java");
    case "cpp":
      return hasAny(["g++", "clang++"]);
    case "c":
      return hasAny(["gcc", "clang"]);
    case "go":
      return hasCommand("go");
    default:
      return false;
  }
}

async function runCode(language, code, options = {}) {
  const filePath = await writeCodeToFile(language, code);
  try {
    return await executeCode(filePath, language, options);
  } finally {
    await cleanupCodeArtifacts(filePath);
  }
}

const languageFixtures = {
  javascript: {
    code: "const nums = [1, 2, 3, 4]; console.log(nums.reduce((a, b) => a + b, 0));",
    expected: "10",
    timeoutMs: 2000,
  },
  python: {
    code: "nums = [1, 2, 3, 4]\nprint(sum(nums))",
    expected: "10",
    timeoutMs: 2500,
  },
  java: {
    code: `
public class Main {
  public static void main(String[] args) {
    int sum = 0;
    for (int i = 1; i <= 4; i++) sum += i;
    System.out.println(sum);
  }
}
`,
    expected: "10",
    timeoutMs: 5000,
  },
  cpp: {
    code: `
#include <iostream>
int main() {
  int sum = 0;
  for (int i = 1; i <= 4; i++) sum += i;
  std::cout << sum << std::endl;
  return 0;
}
`,
    expected: "10",
    timeoutMs: 5000,
  },
  c: {
    code: `
#include <stdio.h>
int main() {
  int sum = 0;
  for (int i = 1; i <= 4; i++) sum += i;
  printf("%d\\n", sum);
  return 0;
}
`,
    expected: "10",
    timeoutMs: 5000,
  },
  go: {
    code: `
package main
import "fmt"
func main() {
  sum := 0
  for i := 1; i <= 4; i++ {
    sum += i
  }
  fmt.Println(sum)
}
`,
    expected: "10",
    timeoutMs: 15000,
  },
};

for (const [language, fixture] of Object.entries(languageFixtures)) {
  test(
    `${language}: basic execution works`,
    { skip: !isLanguageAvailable(language) },
    async () => {
      const output = await runCode(language, fixture.code, {
        timeoutMs: fixture.timeoutMs || 3000,
        memoryMb: 128,
      });
      assert.equal(output.trim(), fixture.expected);
    },
  );
}

test("javascript sandbox hides process and require", async () => {
  const output = await runCode(
    "javascript",
    "console.log(typeof process); console.log(typeof require);",
    {
      timeoutMs: 1000,
      memoryMb: 64,
    },
  );

  assert.deepEqual(output.trim().split(/\r?\n/), ["undefined", "undefined"]);
});

test("javascript infinite loop is terminated by timeout", async () => {
  await assert.rejects(
    runCode("javascript", "while (true) {}", {
      timeoutMs: 500,
      memoryMb: 64,
    }),
    /(timed out|terminated)/i,
  );
});

test("javascript output bomb is cut off", async () => {
  await assert.rejects(
    runCode(
      "javascript",
      `for (let i = 0; i < 8000; i++) { console.log("xxxxxxxxxxxxxxxxxxxx"); }`,
      {
        timeoutMs: 2000,
        memoryMb: 64,
      },
    ),
    /output exceeded/i,
  );
});

test(
  "python process receives sanitized environment (no secret leak)",
  { skip: !isLanguageAvailable("python") },
  async () => {
    const previous = process.env.SECRET_TEST_VAR;
    process.env.SECRET_TEST_VAR = "MUST_NOT_LEAK";
    try {
      const output = await runCode(
        "python",
        `import os\nprint(os.getenv("SECRET_TEST_VAR") or "")`,
        {
          timeoutMs: 1500,
          memoryMb: 64,
        },
      );
      assert.equal(output.trim(), "");
    } finally {
      if (previous === undefined) {
        delete process.env.SECRET_TEST_VAR;
      } else {
        process.env.SECRET_TEST_VAR = previous;
      }
    }
  },
);
