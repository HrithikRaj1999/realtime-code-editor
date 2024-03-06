import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import useGetWindowSize from "../hooks/getWindowSize";
import { useEffect, useState } from "react";
import { useSocketContext } from "../context/SocketContext";
import ACTIONS from "../constants/constants";
import useCodeEditorPanelManipulation from "../hooks/useCodeEditorPanelManipulation";

export default function CodeEditor({ roomId }: { roomId: string | undefined }) {
  const { socket } = useSocketContext();
  const [width, height] = useGetWindowSize();

  const { handleCodeChange, code } = useCodeEditorPanelManipulation(socket);

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
