import useGetWindowSize from "../hooks/getWindowSize";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect } from "react";
import { ACTIONS } from "../constants/constants";
import { useSocketContext } from "../context/SocketContext";
import { useParams } from "react-router-dom";
interface OutputSectionPropsType {
  language: string;
  output: string;
  setOutput: React.Dispatch<React.SetStateAction<string>>;
}
const OutputSection = ({
  language,
  output,
  setOutput,
}: OutputSectionPropsType) => {
  const [width, height] = useGetWindowSize();
  const { socket } = useSocketContext();
  const { roomId } = useParams();
  
  useEffect(() => {
    const handleOutputChange = (newOutput: string) => {
      setOutput(newOutput);
    };

    socket.emit(ACTIONS.OUTPUT_CHANGE, { output, roomId });
    socket.on(ACTIONS.OUTPUT_CHANGE, handleOutputChange);

    return () => {
      socket.off(ACTIONS.OUTPUT_CHANGE, handleOutputChange);
    };
  }, [socket, roomId, output, setOutput]);
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
