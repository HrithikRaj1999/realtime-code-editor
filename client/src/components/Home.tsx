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
    <div className="h-screen  border-2 text-white flex flex-col justify-center items-center">
      <div className="flex flex-col h-2/6 gap-y-3 w-4/12 bg-slate-300 p-4  justify-center items-center rounded-md">
        <div className="flex flex-col gap-y-3 ">
          <input
            type="text"
            id="roomId"
            name="roomId"
            value={information.roomId}
            className="border-2 p-2 box-content rounded-md text-black"
            placeholder={"Enter Room Id"}
            onChange={handleChangeRoomId}
            onKeyUp={handleKeyUp}
          />
          <input
            type="text"
            id="username"
            name="username"
            className="border-2 p-2  box-content rounded-md"
            placeholder="User name"
            onChange={handleChangeUsername}
            onKeyUp={handleKeyUp}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleCreateOrJoinRoom}
            className="p-2 bg-green-600  font-medium cursor-pointer rounded hover:bg-green-700"
          >
            {information.isCreateRoom ? "Create Room" : "Join Room"}
          </button>
        </div>
        <span className="font-medium text-blue-900">
          {information.isCreateRoom ? "Don't what to create ?  " : "Dont have room id ? "}
          <u
            onClick={handleCreateNewRoom}
            className="cursor-pointer text-pretty font-semibold text-slate-900"
          >
            {information.isCreateRoom ? "Join Room" : "create Room"}
          </u>
        </span>
      </div>
    </div>
  );
};

export default Home;
