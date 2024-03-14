import axios from "axios";
import { SetStateAction } from "react";
import toast from "react-hot-toast";

const useEditorCode = (setOutput: React.Dispatch<SetStateAction<string>>) => {
  const handleSubmitCode = async (language: string, code: string) => {
    try {
      // const response = await axios.post("http://localhost:8000/run", {
        const response = await axios.post("https://realtime-code-editor-c7wm.onrender.com/run", {
        language,
        code,
      });
      const { result } = response.data;
      setOutput(result);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return { handleSubmitCode, setOutput };
};
export default useEditorCode;
