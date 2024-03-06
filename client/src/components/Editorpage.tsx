import Client from "./Client";
import CodeEditor from "./CodeEditor";
import { useSocketContext } from "../context/SocketContext";
import { Navigate, useLocation, useParams } from "react-router-dom";
import useEditorManipulation from "../hooks/useEditorManipulation";

const Editorpage = () => {
  const { socket, clients, setClients } = useSocketContext();
  const location = useLocation();
  const { handleCopyRoomId,handleLeaveRoom } = useEditorManipulation({
    socket,
    clients,
    setClients,
  });
  const { roomId } = useParams();
  if (!location.state) return <Navigate to="/" />;
  return (
    <div className="flex flex-row min-h-screen ">
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
          <button onClick={handleLeaveRoom} className="sm:w-[100px] md:w-[150px] text-xl bg-red-700 rounded-xl p-2">
            Leave Room
          </button>
        </div>
      </section>
      <section className="flex flex-1 justify-center items-center">
        <CodeEditor {...{ roomId }} />
      </section>
    </div>
  );
};

export default Editorpage;
