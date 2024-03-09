import express, { Express } from "express";
import { runCode } from "../controller/codeRunner.controller";

const codeRunnerRouter = express.Router();

codeRunnerRouter.post("/", runCode);

export default codeRunnerRouter;
