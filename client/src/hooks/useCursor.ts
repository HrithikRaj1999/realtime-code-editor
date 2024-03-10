import { useSocketContext } from "../context/SocketContext";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { useUserContext } from "../context/UserContext";

export interface TypingSockets {
  socketId: string;
  username: string;
  visible: boolean;
  timeoutId?: number; // Updated type here
}
const useCursor = (code: string) => {
  // const { user } = useUserContext();
  const [typingSockets, setTypingSockets] = useState<
    TypingSockets[] | undefined
  >([]);

  const { socket, clients } = useSocketContext();

  const handleTyping = ({ socketId, username }: TypingSockets) => {
    console.log({ clients: clients, bcuser: username, bcScoke: socketId });
    setTypingSockets((prev = []) => {
      const existingUserIndex = prev.findIndex(
        (user) => user.socketId === socketId
      );
      if (existingUserIndex > -1) {
        // Update the existing user's timeout
        clearTimeout(prev[existingUserIndex].timeoutId);
        const updatedUsers = prev.map((user, index) => {
          if (index === existingUserIndex) {
            return {
              ...user,
              visible: true,
              timeoutId: window.setTimeout(() => removeUser(socketId), 2000),
            };
          }
          return user;
        });
        return updatedUsers;
      } else {
        // Add a new typing user
        return [
          ...prev,
          {
            socketId,
            username,
            visible: true,
            timeoutId: window.setTimeout(() => removeUser(socketId), 2000),
          },
        ];
      }
    });
  };

  // Function to remove typing indicator
  const removeUser = (socketId: string) => {
    setTypingSockets((prev) =>
      prev?.filter((user) => user.socketId !== socketId)
    );
  };

  useEffect(() => {
    socket.on("typing-recieved", handleTyping);
    return () => {
      socket?.off("typing", removeUser);
    };
  }, [socket]);
  return { typingSockets };
};

export default useCursor;
