import { PropsWithChildren } from "react";
import ClientSocketProvider from "../context/SocketContext";

const Layout = ({ children }: PropsWithChildren) => {
  return <ClientSocketProvider>{children}</ClientSocketProvider>;
};

export default Layout;
