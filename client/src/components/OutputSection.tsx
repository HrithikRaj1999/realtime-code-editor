import useGetWindowSize from "../hooks/getWindowSize";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
interface OutputSectionPropsType {
  language: string;
  output: string;
}
const OutputSection = ({ language, output }: OutputSectionPropsType) => {
  const [width, height] = useGetWindowSize();
  console.log(`Output section`, output, language);
  return (
    <>
      <h1 className="px-4 text-2xl bg-black text-nowrap text-white">
        Output :-
      </h1>
      <CodeMirror
        value={output}
        editable={false}
        className="overflow-y-scroll"
        // onChange={handleCodeChange}
        height={`${height / 2}px`}
        theme={vscodeDark}
        extensions={[javascript()]}
        style={{ fontSize: 16, width }}
      />
    </>
  );
};

export default OutputSection;
