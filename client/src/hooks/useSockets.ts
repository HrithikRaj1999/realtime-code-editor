import { DefaultEventsMap } from "@socket.io/component-emitter";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Socket } from "socket.io-client";
// import { ACTIONS } from "../constants/constants";

import { useParams } from "react-router-dom";
import { ClientType, HandleNewJoin } from "../utils/types";
import { ACTIONS } from "../constants/constants";

export const useSockets = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap>,
  setSocket: React.Dispatch<
    React.SetStateAction<Socket<DefaultEventsMap, DefaultEventsMap>>
  >,
) => {
  function handleErrors(error: Error) {
    console.error("socket error", error);
    toast.error("Socket connection error");
  }
  const params = useParams();
  const [clients, setClients] = useState<ClientType[] | []>([]);

  useEffect(() => {
    setSocket(socket);
    const onConnect = () => {
      console.log("client connected");
    };
    const onConnectError = (error: Error) => {
      handleErrors(error);
    };
    const onConnectFailed = (error: Error) => {
      handleErrors(error);
    };
    socket.emit(ACTIONS.JOIN, {
      roomId: params.roomId,
      username: params.username,
    });
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("connect_failed", onConnectFailed);
    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("connect_failed", onConnectFailed);
    };
  }, []);
  return { clients, setClients };
};
