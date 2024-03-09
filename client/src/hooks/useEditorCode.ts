import axios from "axios";
import { SetStateAction } from "react";
import toast from "react-hot-toast";

const useEditorCode = (setOutput: React.Dispatch<SetStateAction<string>>) => {
  const handleSubmitCode = async (language: string, code: string) => {
    try {
      console.log({ language, code });
      const response = await axios.post("http://localhost:8000/run", {
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