import { ChangeEvent, MouseEvent, useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { InformationTypes, UseRoomCreateReturn } from "../utils/types";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const useRoomCreate = (): UseRoomCreateReturn => {
  const navigate = useNavigate();

  const [information, setInformation] = useState<InformationTypes>({
    roomId: "",
    username: "",
    isCreateRoom: false,
  });
  const handleCreateNewRoom = (
    e: MouseEvent<HTMLElement, globalThis.MouseEvent>,
  ) => {
    setInformation((prev) => ({
      ...prev,
      isCreateRoom: !prev.isCreateRoom,
      roomId: uuidV4(),
    }));
  };
  const handleChangeRoomId = (e: ChangeEvent<HTMLInputElement>) => {
    setInformation((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  const handleChangeUsername = (e: ChangeEvent<HTMLInputElement>) => {
    setInformation((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreateOrJoinRoom = () => {
    if (!information.roomId.length) {
      toast.error("Please enter a room id");
    }
    if (!information.username.length) {
      toast.error("Please enter a username");
    } else {
      navigate(`/editor/${information.roomId}/${information.username}`, {
        state: { username: information.username },
      });
      toast.success(
        information.isCreateRoom ? "Room created" : "you joined a room ",
      );
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "Enter") {
      handleCreateOrJoinRoom();
    }
  };
  return [
    information,
    setInformation,
    handleCreateNewRoom,
    handleChangeRoomId,
    handleChangeUsername,
    handleCreateOrJoinRoom,
    navigate,
    handleKeyUp,
  ];
};

export default useRoomCreate;
