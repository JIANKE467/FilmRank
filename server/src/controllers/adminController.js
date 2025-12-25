import pool from "../db/pool.js";

export async function listUsers(req, res, next) {
  try {
    const { q } = req.query;
    let sql = "SELECT user_id, username, email, role, status, created_at FROM users";
    const params = [];
    if (q) {
      sql += " WHERE username LIKE ? OR email LIKE ?";
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += " ORDER BY created_at DESC";
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function setUserStatus(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const { status } = req.body;
    if (!status || !["active", "banned"].includes(status)) {
      return res.status(400).json({ error: "status must be active or banned" });
    }
    const [result] = await pool.query("UPDATE users SET status = ? WHERE user_id = ?", [status, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "user not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function setRatingPolicy(req, res, next) {
  try {
    const { min_score, max_score, step, allow_update } = req.body;
    if (min_score === undefined || max_score === undefined || step === undefined) {
      return res.status(400).json({ error: "min_score, max_score, step required" });
    }
    await pool.query("UPDATE rating_policy SET is_active = FALSE");
    const [result] = await pool.query(
      "INSERT INTO rating_policy (min_score, max_score, step, allow_update, is_active) VALUES (?, ?, ?, ?, TRUE)",
      [min_score, max_score, step, allow_update !== undefined ? !!allow_update : true]
    );
    return res.status(201).json({ policy_id: result.insertId });
  } catch (err) {
    return next(err);
  }
}
