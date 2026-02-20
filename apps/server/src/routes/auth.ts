import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  generateToken,
  generateRoomToken,
  verifyRoomToken,
  authMiddleware,
} from "../middleware/auth";

const router = Router();

// Simple in-memory user store (upgrade to Postgres later)
const users = new Map<string, { id: string; username: string; password: string }>();

// POST /auth/register
router.post("/register", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (username.length < 2 || username.length > 30) {
    return res.status(400).json({ error: "Username must be 2-30 characters" });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  // Check for duplicate username
  for (const user of users.values()) {
    if (user.username.toLowerCase() === username.toLowerCase()) {
      return res.status(409).json({ error: "Username already taken" });
    }
  }

  const id = uuidv4();
  // In production, hash the password with bcrypt
  users.set(id, { id, username, password });

  const token = generateToken({ userId: id, username });
  res.status(201).json({ token, user: { id, username } });
});

// POST /auth/login
router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  let foundUser = null;
  for (const user of users.values()) {
    if (user.username.toLowerCase() === username.toLowerCase() && user.password === password) {
      foundUser = user;
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken({ userId: foundUser.id, username: foundUser.username });
  res.json({ token, user: { id: foundUser.id, username: foundUser.username } });
});

// POST /auth/room-token (generate room invite)
router.post("/room-token", authMiddleware, (req: Request, res: Response) => {
  const { roomId } = req.body;
  const user = (req as any).user;

  if (!roomId) {
    return res.status(400).json({ error: "roomId is required" });
  }

  const token = generateRoomToken(roomId, user.username);
  const inviteUrl = `${req.protocol}://${req.get("host")}/editor/${roomId}?invite=${token}`;
  res.json({ token, inviteUrl });
});

// POST /auth/verify-room-token
router.post("/verify-room-token", (req: Request, res: Response) => {
  const { token } = req.body;
  try {
    const payload = verifyRoomToken(token);
    res.json({ valid: true, ...payload });
  } catch (error) {
    res.status(400).json({ valid: false, error: "Invalid room token" });
  }
});

// GET /auth/me (verify current token)
router.get("/me", authMiddleware, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

export default router;
