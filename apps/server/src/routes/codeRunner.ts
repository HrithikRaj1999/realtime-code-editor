import express from "express";

const codeRunnerRouter = express.Router();

// This route is now a proxy — actual execution is handled by orchestrator/runner.
// Kept for backwards compatibility but the /run route in server.ts already proxies to orchestrator.
codeRunnerRouter.post("/", async (req, res) => {
  res.status(410).json({
    error:
      "Direct code execution is deprecated. Use /run endpoint which proxies to orchestrator.",
  });
});

export default codeRunnerRouter;
