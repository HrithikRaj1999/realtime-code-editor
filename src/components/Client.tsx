import React from "react";
import Avatar from "react-avatar";

interface Avatarprops {
  username: string;
  socketId: number;
}
const Client = ({ username, socketId }: Avatarprops) => {
  return (
    <div className="flex flex-col items-center">
      <Avatar name={username} size="50" round="30px" />
      <span className="username text-nowrap text-white font-mono font-medium">
        {username}
      </span>
    </div>
  );
};

export default Client;
