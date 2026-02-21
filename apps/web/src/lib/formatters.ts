const JAVASCRIPT_LANGUAGES = new Set(["javascript", "js"]);
const SYNTAX_LOCATION_PATTERN = /\((\d+):(\d+)\)\s*$/;

function trimTrailingWhitespace(source: string) {
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
}

export async function formatJavascriptCode(source: string) {
  try {
    const [{ default: prettier }, babelModule, estreeModule] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);

    const babelPlugin = babelModule.default ?? babelModule;
    const estreePlugin = estreeModule.default ?? estreeModule;

    return prettier.format(source, {
      parser: "babel",
      plugins: [babelPlugin, estreePlugin],
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      printWidth: 100,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Invalid JavaScript syntax";
    const firstLine = rawMessage.split("\n")[0].trim();
    const locationMatch = firstLine.match(SYNTAX_LOCATION_PATTERN);

    if (locationMatch) {
      const [, line, column] = locationMatch;
      throw new Error(
        `Cannot format JavaScript due to syntax error at line ${line}, column ${column}.`,
      );
    }

    throw new Error(`Cannot format JavaScript: ${firstLine}`);
  }
}

export async function formatCodeByLanguage(source: string, language: string) {
  const normalizedLanguage = language.toLowerCase();

  if (JAVASCRIPT_LANGUAGES.has(normalizedLanguage)) {
    return formatJavascriptCode(source);
  }

  return trimTrailingWhitespace(source);
}
