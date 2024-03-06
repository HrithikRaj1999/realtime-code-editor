import { useEffect, useState } from "react";
import ACTIONS from "../constants/constants";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  HandleLeave,
  HandleNewJoin,
  UseEditorParamsTypes,
} from "../utils/types";

export default function useEditorManipulation({
  socket,
  clients,
  setClients,
}: UseEditorParamsTypes) {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(params.roomId!);
    toast.success("Room ID Copied to Clipboard");
  };

  const handleLeaveRoom = () => {
    socket.emit(ACTIONS.LEAVE);
    navigate("/");
  };
  useEffect(() => {
    socket.emit(ACTIONS.JOIN, {
      roomId: params.roomId,
      username: location.state?.username,
    });
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
    socket.on(ACTIONS.JOINED, handleNewJoin);
    socket.on(ACTIONS.DISCONNECTED, handleLeave);
    return () => {
      socket.off(ACTIONS.JOINED);
      socket.off(ACTIONS.DISCONNECTED);
    };
  }, []);
  return { handleCopyRoomId, handleLeaveRoom };
}
