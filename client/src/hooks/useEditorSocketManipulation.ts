import { useEffect } from "react";
import { ACTIONS } from "../constants/constants";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HandleLeave, HandleNewJoin } from "../utils/types";
import { useSocketContext } from "../context/SocketContext";

export default function useEditorSocketManipulation() {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { socket, setClients } = useSocketContext();
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(params.roomId!);
    toast.success("Room ID Copied to Clipboard");
  };
  const handleLeaveRoom = () => {
    socket.emit(ACTIONS.LEAVE);
    // Push a "fake" entry immediately after the room is loaded
    window.history.pushState(null, "", window.location.href);
    // Listen for back button presses (or forward button, for that matter)
    window.onpopstate = function () {
      // When back is pressed, replace the current URL with your target destination
      window.history.go(1); // Forward the user back to where you pushed the state
      // Or, navigate them to a different page, e.g., the home page or a "room closed" notification page
      // window.location.href = '/home';
    };
    navigate("/");
  };
  const handleNewJoin = ({ username, socketId, clients }: HandleNewJoin) => {
    //dont show the new joinee the toast show everyone else
    if (username !== location.state?.username) {
      toast.success(`${username} Joined the room`);
    }
    setClients([...clients]);
  };
  const handleLeave = ({ username, socketId }: HandleLeave) => {
    toast.success(`${username} Left the room`);
    setClients((prev) => {
      return prev.filter((client) => client.socketId !== socketId);
    });
  };
  useEffect(() => {
    socket.emit(ACTIONS.JOIN, {
      roomId: params.roomId,
      username: location.state?.username,
    });

    socket.on(ACTIONS.JOINED, handleNewJoin);
    socket.on(ACTIONS.DISCONNECTED, handleLeave);
    return () => {
      socket.off(ACTIONS.JOINED);
      socket.off(ACTIONS.DISCONNECTED);
    };
  }, []);
  return {
    handleCopyRoomId,
    handleLeaveRoom,
  };
}
