import { useState } from "react";
import Client from "./Client";
import CodeEditor from "./CodeEditor";

const Editorpage = () => {
  const [clients, setClients] = useState([
    {
      username: "Haju",
      socketId: 1,
    },
    {
      username: "Rastogi",
      socketId: 2,
    },
  ]);
  return (
    <div className="flex flex-row min-h-screen ">
      <section className="px-3 bg-black flex flex-col items-start gap-y-3 w-1/4">
        <div className="flex flex-wrap gap-x-2 justify-center items-center m-2">
          <img
            src="/logo.JPEG"
            className="w-[50px] h-[50px] rounded-[50%] overflow-hidden relative inline-block"
            alt="logo"
          />
          <div className="  text-white text-wrap">Real Time Code Editor</div>
        </div>
        <div className="flex flex-wrap gap-x-2 justify-center  items-center">
          {clients?.map((client) => (
            <Client key={client.socketId} {...client} />
          ))}
        </div>
        <div className="flex flex-col justify-center gap-y-2">
          <button className="border-3 w-[50px] sm:w-[100px] md:w-[150px] text-sm sm:text-md md:text-xl bg-green-500 rounded-full p-2 text-white">
            Copy Room Id
          </button>
          <button className="border-3 w-[50px] sm:w-[100px] md:w-[150px] text-sm sm:text-md md:text-xl bg-red-700 rounded-full p-2 text-white">
            Leave Room
          </button>
        </div>
      </section>
      <section className="flex flex-1 justify-center items-center">
        <CodeEditor />
      </section>
    </div>
  );
};

export default Editorpage;
