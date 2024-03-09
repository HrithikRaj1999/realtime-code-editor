import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";
import ACTIONS from "../constants/constants";
import { useParams } from "react-router-dom";

const useCodeEditorPanelManipulation = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap>,
) => {
  const [code, setCode] = useState("hello world");
  const handleCodeChange = (code: string) => {
    if (code) setCode(code);
    else setCode("");
  };
  const { roomId } = useParams();
  useEffect(() => {
    socket.emit(ACTIONS.CODE_CHANGE, { code, roomId });
    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    return () => {
      socket.off(ACTIONS.CODE_CHANGE);
    };
  }, [socket, code, roomId]);
  return { handleCodeChange, code };
};

export default useCodeEditorPanelManipulation;
