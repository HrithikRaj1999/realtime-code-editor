import { Request, Response } from "express";
import { tryCatchError } from "../utils/ErrorHandler";
import generateFile from "../utils/generateFile";
import executeCode from "../utils/executeCode";

export const runCode = tryCatchError(async (req: Request, res: Response) => {
  const { language, code } = req.body;
  if (!language) {
    return res.status(400).json({
      error: "Language is required",
    });
  }
  if (!code) {
    return res.status(400).json({
      error: "code is required",
    });
  }
  const filePath = await generateFile(language, code);
  try {
    const result = await executeCode(filePath, language);
    console.log("Execution Output:", result);
    return res.status(200).send({ result });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : error;
    const modifiedMessage = errorMessage.split("\u001b")[0];
    return res.status(200).send({ result: modifiedMessage.split("\n").splice(1).join("\n") });
  }
});
