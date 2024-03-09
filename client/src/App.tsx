import { RouterProvider } from "react-router-dom";
import "./App.css";
import appRouter from "./components/Router";
import ClientSocketProvider from "./context/SocketContext";

function App() {
  return <RouterProvider router={appRouter} />;
}

export default App;
