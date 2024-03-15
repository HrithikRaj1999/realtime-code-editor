import { useEffect } from "react";
import toast from "react-hot-toast";
import { TypingSockets } from "../hooks/useCursor";
import { useUserContext } from "../context/UserContext";

interface TypingIndicatorpropsType {
  typingSockets: TypingSockets[] | undefined;
}
const TypingIndicator = ({ typingSockets }: TypingIndicatorpropsType) => {
  const { user } = useUserContext();
  useEffect(() => {
    // Clear existing toasts to prevent duplicates
    if (typingSockets && typingSockets?.length > 0) {
      // Show a new toast for typing indicators
      typingSockets.forEach((info) => {
        return info.visible
          ? toast.custom(
              <span className="text-white" key={info.socketId}>
                <b>{user ? user[info.socketId] : null} {info.username} </b>typing.....
              </span>,
              {
                position: "bottom-left",
                duration: 2000, // Adjust based on your needs
                id: info.socketId, // Use socketId as a unique identifier for the toast
              }
            )
          : null;
      });
    } else toast.dismiss();
  }, [typingSockets, user]);

  return null;
};

export default TypingIndicator;
