// axiosDefaults.js
import axios from "axios";

axios.defaults.proxy = {
  host: "localhost", // without http://
  port: 8000,
  protocol: "http",
};



export default axios;
