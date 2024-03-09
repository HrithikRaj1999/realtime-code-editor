import { useState, createContext, useContext } from "react";
import { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { SocketContextType, propsType } from "../utils/types";
import { OPTIONS } from "../constants/socket";
import { useSockets } from "../hooks/useSockets";

const ClientSocket = createContext({} as SocketContextType);
const ClientSocketProvider = (props: propsType) => {
  const { children } = props;
  const [socket, setSocket] = useState<Socket>(
    io(process.env.REACT_APP_SOCKET_URL!, OPTIONS),
  );
  const { clients, setClients } = useSockets(socket, setSocket);
  return (
    <ClientSocket.Provider value={{ socket, setSocket, clients, setClients }}>
      {children}
    </ClientSocket.Provider>
  );
};
export const useSocketContext = () => useContext(ClientSocket);

export default ClientSocketProvider;
