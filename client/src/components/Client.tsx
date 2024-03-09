import React from "react";
import Avatar from "react-avatar";
import { Avatarprops } from "../utils/types";

const Client = ({ username, socketId }: Avatarprops) => {
  return (
    <div className="flex flex-col">
      <Avatar name={username} size="50" round="30px" textSizeRatio={2} />
      <span className=" text-white  font-medium">{username}</span>
    </div>
  );
};

export default Client;
