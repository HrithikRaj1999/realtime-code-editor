// Shared language manifest — used by frontend dropdown and runner execution
export interface LanguageConfig {
  id: string;
  name: string;
  extension: string;
  compileCmd?: string;
  runCmd: string;
  monacoId: string; // Monaco/CodeMirror language identifier
}

export const LANGUAGES: LanguageConfig[] = [
  {
    id: "javascript",
    name: "JavaScript",
    extension: "js",
    runCmd: "node",
    monacoId: "javascript",
  },
  {
    id: "python",
    name: "Python",
    extension: "py",
    runCmd: "python3",
    monacoId: "python",
  },
  {
    id: "java",
    name: "Java",
    extension: "java",
    runCmd: "java",
    monacoId: "java",
  },
  {
    id: "cpp",
    name: "C++",
    extension: "cpp",
    compileCmd: "g++",
    runCmd: "./a.out",
    monacoId: "cpp",
  },
  {
    id: "go",
    name: "Go",
    extension: "go",
    runCmd: "go run",
    monacoId: "go",
  },
  {
    id: "c",
    name: "C",
    extension: "c",
    compileCmd: "gcc",
    runCmd: "./a.out",
    monacoId: "c",
  },
];

export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id);

export function getLanguageById(id: string): LanguageConfig | undefined {
  return LANGUAGES.find((l) => l.id === id.toLowerCase());
}
