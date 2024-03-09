import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import useGetWindowSize from "../hooks/getWindowSize";
import { useSocketContext } from "../context/SocketContext";
import useCodeEditorPanelManipulation from "../hooks/useCodeEditorPanelManipulation";
import { SetStateAction } from "react";
import useEditorCode from "../hooks/useEditorCode";

export default function CodeEditor({
  roomId,
  code,
  setCode,
  language,
  setLanguage,
  setOutput,
}: {
  roomId: string | undefined;
  code: string;
  language: string;
  setCode: React.Dispatch<SetStateAction<string>>;
  setLanguage: React.Dispatch<SetStateAction<string>>;
  setOutput: React.Dispatch<SetStateAction<string>>;
}) {
  const { socket } = useSocketContext();
  const [width, height] = useGetWindowSize();
  const { handleSubmitCode } = useEditorCode(setOutput);
  const { handleCodeChange } = useCodeEditorPanelManipulation(
    socket,
    code,
    setCode
  );

  return (
    <div style={{ width: `${width}px` }}>
      <div className="flex  gap-5 bg-black text-nowrap items-center  text-white">
        <h1 className="px-4 text-2xl bg-black text-nowrap text-white"> Code</h1>
        <div className="flex flex-row gap-5 p-4 w-full ">
          <button
            onClick={() => handleSubmitCode(language, code)}
            className="sm:w-[100px] md:w-[150px] text-xl bg-blue-700 rounded-xl p-2"
          >
            Submit Code
          </button>
          <select
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block  p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 w-2/12"
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="js">Javascript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c">C</option>
            <option value="c++">C++</option>
            <option value="c#">C#</option>
          </select>
          <button
            onClick={() => setOutput("")}
            className="sm:w-[100px] md:w-[150px] text-xl bg-red-700 rounded-xl p-2"
          >
            clear output
          </button>
          <button
            onClick={() => setCode("")}
            className=" sm:w-[100px] md:w-[150px]  text-xl bg-green-500 rounded-xl p-2 "
          >
            reset code
          </button>
        </div>
      </div>
      <CodeMirror
        value={code}
        onChange={handleCodeChange}
        height={`${height / 2}px`}
        theme={vscodeDark}
        extensions={[javascript()]}
        style={{ fontSize: 16 }}
      />
    </div>
  );
}
