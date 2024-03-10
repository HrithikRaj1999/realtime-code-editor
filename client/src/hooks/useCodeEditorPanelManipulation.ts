import React, { SetStateAction, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";
import { ACTIONS } from "../constants/constants";

import { useParams } from "react-router-dom";

import { useSocketContext } from "../context/SocketContext";

const useCodeEditorPanelManipulation = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap>,
  code: string,
  setCode: React.Dispatch<SetStateAction<string>>,
  setOutput: React.Dispatch<SetStateAction<string>>,
  output: string
) => {
  const { roomId } = useParams();

  const handleCodeChange = (code: string) => {
    if (code) setCode(code);
    else setCode("");
  };

  useEffect(() => {
    socket?.emit(ACTIONS.CODE_CHANGE, { code, roomId });
    socket?.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    return () => {
      socket?.off(ACTIONS.CODE_CHANGE);
    };
  }, [socket, code, roomId]);

  useEffect(() => {
    socket?.emit(ACTIONS.OUTPUT_CHANGE, { output, roomId });
    socket?.on(ACTIONS.OUTPUT_CHANGE, (output: string) => {
      setOutput(output);
    });
    return () => {
      socket?.off(ACTIONS.OUTPUT_CHANGE);
    };
  }, [output, roomId, setOutput, socket]);

  return { handleCodeChange, code };
};

export default useCodeEditorPanelManipulation;
