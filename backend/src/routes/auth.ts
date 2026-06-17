import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { registerSchema, loginSchema } from "../validators/auth.js";

const router = Router();

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function generateAccessToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"],
  });
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });
}

function setRefreshCookie(res: import("express").Response, token: string) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: import("express").Response) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
}

interface ZodIssue {
  message: string;
  path: (string | number)[];
}

function isZodError(err: unknown): err is { name: string; issues: ZodIssue[] } {
  return err instanceof Error && err.name === "ZodError";
}

function formatZodError(issues: ZodIssue[]): string {
  return issues.map((i) => {
    const field = i.path.length > 0 ? `${i.path.join(".")}: ` : "";
    return field + i.message;
  }).join(", ");
}

router.post("/register", async (req, res) => {
  try {
    const { email, password } = registerSchema.parse(req.body);

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, passwordHash]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, refreshToken, expiresAt]
    );

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      user: { id: user.id, email: user.email, createdAt: user.created_at },
      accessToken,
    });
  } catch (err) {
    if (isZodError(err)) {
      res.status(400).json({ error: formatZodError(err.issues) });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, refreshToken, expiresAt]
    );

    setRefreshCookie(res, refreshToken);

    res.json({
      user: { id: user.id, email: user.email, createdAt: user.created_at },
      accessToken,
    });
  } catch (err) {
    if (isZodError(err)) {
      res.status(400).json({ error: formatZodError(err.issues) });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token required" });
      return;
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };

    const tokenResult = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND is_revoked = FALSE AND expires_at > NOW()",
      [refreshToken, decoded.userId]
    );

    if (tokenResult.rows.length === 0) {
      clearRefreshCookie(res);
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    await pool.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1", [refreshToken]);

    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [decoded.userId, newRefreshToken, expiresAt]
    );

    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    clearRefreshCookie(res);
    console.error("Refresh error:", err);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await pool.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1", [refreshToken]);
    }
    clearRefreshCookie(res);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
