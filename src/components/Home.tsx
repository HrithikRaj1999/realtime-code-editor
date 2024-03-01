import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="h-screen order-2 flex flex-col justify-center items-center">
      <h4>Paste Invitation Room Id</h4>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-3">
          <input
            type="text"
            className="border-2 p-2"
            placeholder="Enter Room Id"
          />
          <input type="text" className="border-2 p-2" placeholder="User name" />
        </div>
        <div className="flex justify-end">
          <button className="p-2 bg-blue-600 text-white ">Join </button>
        </div>
        <span className="font-medium">
          Dont Have? <Link className="underline "to={"/create-room"}>Create Room</Link>
        </span>
      </div>
    </div>
  );
};

export default Home;
