import { Request, Response } from "express";
import { validateAdmin } from "../services/auth.service";
import { signToken } from "../utils/jwt";

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "Missing username or password" });
    }

    const ok = await validateAdmin(username, password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ username });
    return res.json({
      token,
      user: { username },
      expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function me(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  res.json({ user: req.user });
}
