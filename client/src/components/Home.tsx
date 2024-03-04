import useRoomCreate from "../hooks/useRoomCreate";
const Home = () => {
  const [
    information,
    ,
    handleCreateNewRoom,
    handleChangeRoomId,
    handleChangeUsername,
    handleCreateOrJoinRoom,
    ,
    handleKeyUp,
  ] = useRoomCreate();
  return (
    <div className="h-screen  border-2 flex flex-col justify-center items-center">
      <h4>Paste Invitation Room Id</h4>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-3">
          <input
            type="text"
            id="roomId"
            name="roomId"
            value={information.roomId}
            className="border-2 p-2 box-content"
            placeholder="Enter Room Id"
            onChange={handleChangeRoomId}
            onKeyUp={handleKeyUp}
          />
          <input
            type="text"
            id="username"
            name="username"
            className="border-2 p-2  box-content"
            placeholder="User name"
            onChange={handleChangeUsername}
            onKeyUp={handleKeyUp}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleCreateOrJoinRoom}
            className="p-2 bg-blue-600 text-white "
          >
            {information.isCreateRoom ? "Create Room" : "Join Room"}
          </button>
        </div>
        <span className="font-medium">
          {information.isCreateRoom ? "Dont what ?  " : "Dont have room id ? "}
          <u onClick={handleCreateNewRoom}>
            {information.isCreateRoom ? "Join Room" : "create Room"}
          </u>
        </span>
      </div>
    </div>
  );
};

export default Home;
