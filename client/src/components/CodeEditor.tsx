import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import useGetWindowSize from "../hooks/getWindowSize";

export default function CodeEditor() {
  const [width, height] = useGetWindowSize();
  return (
    <CodeMirror
      value="hello world"
      height={`${height}px`}
      theme={vscodeDark}
      extensions={[javascript()]}
      style={{ fontSize: 16, width: width }}
    />
  );
}
