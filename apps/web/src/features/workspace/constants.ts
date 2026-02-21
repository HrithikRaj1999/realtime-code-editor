export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 24;
export const FONT_SIZE_DEFAULT = 13;

export const NOTES_DEFAULT_HEIGHT = 200;
export const NOTES_MIN_HEIGHT = 80;
export const NOTES_MAX_HEIGHT = 600;

export const DESKTOP_BREAKPOINT = 1024;

export interface LanguageOption {
  value: string;
  label: string;
}

export const ALLOWED_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
];
