import React, { useEffect } from "react";
import Avatar from "react-avatar";
import { Avatarprops } from "../utils/types";
import { useUserContext } from "../context/UserContext";

const Client = ({ username, socketId }: Avatarprops) => {
  const { user, setUser } = useUserContext();
  useEffect(() => {
    const avatarComponent = (
      <Avatar name={username} size="50" round="30px" textSizeRatio={2} />
    );
    setUser((prev) => ({ ...prev, [socketId]: avatarComponent }));
  }, [setUser, username]);

  return (
    <div title={username} className="flex flex-col cursor-pointer">
      {user?.[socketId]}
    </div>
  );
};

export default Client;
