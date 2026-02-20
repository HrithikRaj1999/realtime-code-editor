const JAVASCRIPT_LANGUAGES = new Set(["javascript", "js"]);

function trimTrailingWhitespace(source: string) {
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
}

export async function formatJavascriptCode(source: string) {
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
}

export async function formatCodeByLanguage(source: string, language: string) {
  const normalizedLanguage = language.toLowerCase();

  if (JAVASCRIPT_LANGUAGES.has(normalizedLanguage)) {
    return formatJavascriptCode(source);
  }

  return trimTrailingWhitespace(source);
}
