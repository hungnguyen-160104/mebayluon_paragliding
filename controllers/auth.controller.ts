import { Request, Response } from "express";
import { validateAdmin } from "../services/auth.service";
import { signToken } from "../utils/jwt";

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "Missing username or password" });
    }

    const level = await validateAdmin(username, password);
    if (!level) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ username, level });
    return res.json({
      token,
      user: { username, level },
      expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.json({ user });
}
