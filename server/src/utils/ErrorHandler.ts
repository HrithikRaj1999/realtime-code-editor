import { Request, Response, NextFunction } from "express";

// Adjust the tryCatchError function to accept the req and res from its calling context
export const tryCatchError = (
  cb: (
    req: Request,
    res: Response
  ) => Promise<Response<any, Record<string, any>>>
) => {
  // Return a new function that Express can call with req, res, and next
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cb(req, res);
    } catch (error: any) {;
      res.status(400).json({ error: error.message });
    }
  };
};
