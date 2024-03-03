import { useState } from "react";
import Client from "./Client";
import CodeEditor from "./CodeEditor";

const Editorpage = () => {
  const [clients] = useState([
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
          <button className=" sm:w-[100px] md:w-[150px]  text-xl bg-green-500 rounded-xl p-2 ">
            Copy Room Id
          </button>
          <button className="sm:w-[100px] md:w-[150px] text-xl bg-red-700 rounded-xl p-2">
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
