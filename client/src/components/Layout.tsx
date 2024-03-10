import { PropsWithChildren } from "react";
import ClientSocketProvider from "../context/SocketContext";
import UserContextProvider from "../context/UserContext";

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <ClientSocketProvider>
      <UserContextProvider>{children}</UserContextProvider>
    </ClientSocketProvider>
  );
};

export default Layout;
