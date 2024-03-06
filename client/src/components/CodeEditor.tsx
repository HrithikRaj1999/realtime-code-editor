import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import useGetWindowSize from "../hooks/getWindowSize";
import { useEffect, useState } from "react";
import { useSocketContext } from "../context/SocketContext";
import ACTIONS from "../constants/constants";

export default function CodeEditor({ roomId }: { roomId: string | undefined }) {
  const [code, setCode] = useState("hello world");
  const { socket } = useSocketContext();
  const [width, height] = useGetWindowSize();
  const handleCodeChange = (code: string) => {
    if (code) setCode(code);
    else setCode("");
  };
  useEffect(() => {
    socket.emit(ACTIONS.CODE_CHANGE, { code, roomId });
    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    return () => {
      socket.off(ACTIONS.CODE_CHANGE);
    };
  }, [socket, code, roomId]);
  return (
    <CodeMirror
      value={code}
      onChange={handleCodeChange}
      height={`${height}px`}
      theme={vscodeDark}
      extensions={[javascript()]}
      style={{ fontSize: 16, width: width }}
    />
  );
}
