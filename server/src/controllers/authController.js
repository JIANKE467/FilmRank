import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";

export async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    const [existing] = await pool.query(
      "SELECT user_id FROM users WHERE username = ? OR email = ?",
      [username, email || null]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "username or email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, 'user', 'active')",
      [username, email || null, passwordHash]
    );
    return res.status(201).json({ user_id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    const [rows] = await pool.query(
      "SELECT user_id, username, password_hash, role, status, email, bio FROM users WHERE username = ?",
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const user = rows[0];
    if (user.status !== "active") {
      return res.status(403).json({ error: "user is banned" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, username: user.username },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );
    return res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        email: user.email,
        bio: user.bio
      }
    });
  } catch (err) {
    return next(err);
  }
}
