import Client from "./Client";
import CodeEditor from "./CodeEditor";
import { useSocketContext } from "../context/SocketContext";
import { Navigate, useLocation, useParams } from "react-router-dom";
import OutputSection from "./OutputSection";
import { useState } from "react";
import useEditorSocketManipulation from "../hooks/useEditorSocketManipulation";
import { RESET_TEXT } from "../constants/constants";
import useCursor from "../hooks/useCursor";
import TypingIndicator from "./TypingIndicator";
const Editorpage = () => {
  const location = useLocation();
  const [code, setCode] = useState(() => {
    // Retrieve code from local storage if exists or set to default
    const savedCode = localStorage.getItem("code");
    return savedCode || RESET_TEXT;
  });
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem("language");
    return savedLanguage || "js";
  });
  const [output, setOutput] = useState(() => {
    const savedOut = localStorage.getItem("output");
    return savedOut || "Run the code to see the output";
  });
  const { handleCopyRoomId, handleLeaveRoom } = useEditorSocketManipulation();
  const { clients } = useSocketContext();
  const { roomId } = useParams();
  const { typingSockets } = useCursor(code);
  if (!location.state) return <Navigate to="/" />;
  return (
    <div className="flex flex-row min-h-screen overflow-y-hidden">
      <section className="min-w-[300px] px-3 bg-black flex flex-col items-start gap-y-3 w-1/4">
        <div className="flex flex-wrap gap-x-2 justify-center items-center m-2">
          <img
            src="/logo.JPEG"
            className="w-[100px] h-[100px] rounded-[50%]  border-hidden"
            alt="logo"
          />
          <span className=" text-white text-nowrap">
            Collaborative Code Editor
          </span>
        </div>

        <div className="flex flex-row gap-x-2 p-1 justify-center items-center">
          {clients?.map((client) => (
            <Client key={client.socketId} {...client} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-2 justify-center gap-y-2 text-white">
          <button
            onClick={handleCopyRoomId}
            className=" sm:w-[100px] md:w-[150px]  text-xl bg-green-500 rounded-xl p-2 "
          >
            Copy Room Id
          </button>
          <button
            onClick={handleLeaveRoom}
            className="sm:w-[100px] md:w-[150px] text-xl bg-red-700 rounded-xl p-2"
          >
            Leave Room
          </button>
        </div>
        <TypingIndicator {...{ typingSockets }} />
      </section>

      <section className="flex flex-col justify-center items-center  w-full ">
        <div className="flex-1">
          <CodeEditor
            {...{
              roomId,
              code,
              setCode,
              language,
              output,
              setLanguage,
              setOutput,
            }}
          />
        </div>
        <div className="flex-1 ">
          <OutputSection {...{ language, output, setOutput }} />
        </div>
      </section>
    </div>
  );
};

export default Editorpage;
