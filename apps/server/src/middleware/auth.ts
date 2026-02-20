import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export interface AuthPayload {
  userId: string;
  username: string;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Room invite token (separate from user auth)
export function generateRoomToken(roomId: string, createdBy: string): string {
  return jwt.sign({ roomId, createdBy, type: "room-invite" }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyRoomToken(token: string): { roomId: string; createdBy: string } {
  const payload = jwt.verify(token, JWT_SECRET) as any;
  if (payload.type !== "room-invite") {
    throw new Error("Invalid room token");
  }
  return { roomId: payload.roomId, createdBy: payload.createdBy };
}
