import React, { useCallback, useEffect, useRef } from "react";
import { throttle } from "lodash";
import { ACTIONS, RESET_TEXT } from "../constants/constants";
import { useParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";
const useCodeEditorPanelManipulation = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap>,
  initialCode: string,
  setCode: React.Dispatch<React.SetStateAction<string>>,
  setOutput: React.Dispatch<React.SetStateAction<string>>,
  initialOutput: string
) => {
  const { roomId } = useParams();
  console.log(initialCode);
  const code = useRef(initialCode);
  const output = useRef(initialOutput);

  // Update ref on code or output change without re-running effects
  useEffect(() => {
    code.current = initialCode;
  }, [initialCode]);

  useEffect(() => {
    output.current = initialOutput;
  }, [initialOutput]);

  const emitCodeChange = useCallback(
    throttle((code: string) => {
      socket.emit(ACTIONS.CODE_CHANGE, { code, roomId });
    }, 500),
    [socket, roomId]
  );
  const handleResetCode = () => {
    setCode(RESET_TEXT);
    emitCodeChange(RESET_TEXT);
    localStorage.removeItem("code");
  };

  const handleCodeChange = useCallback(
    (newCode: string) => {
      socket.emit("typing", roomId);
      setCode(newCode);
      localStorage.setItem("code", newCode);
      emitCodeChange(newCode);
    },
    [setCode, emitCodeChange]
  );

  useEffect(() => {
    const handleIncomingCodeChange = (newCode: string) => {
      if (newCode !== code.current) {
        setCode(newCode);
      }
    };

    socket.on(ACTIONS.CODE_CHANGE, handleIncomingCodeChange);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, handleIncomingCodeChange);
      emitCodeChange.cancel();
    };
  }, [socket, setCode, emitCodeChange]);

  useEffect(() => {
    const handleOutputChange = (newOutput: string) => {
      setOutput(newOutput);
    };

    socket.emit(ACTIONS.OUTPUT_CHANGE, { output: output.current, roomId });
    socket.on(ACTIONS.OUTPUT_CHANGE, handleOutputChange);

    return () => {
      socket.off(ACTIONS.OUTPUT_CHANGE, handleOutputChange);
    };
  }, [socket, roomId, setOutput]);

  return { handleResetCode, handleCodeChange, code: code.current };
};

export default useCodeEditorPanelManipulation;
