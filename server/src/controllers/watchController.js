import pool from "../db/pool.js";

export async function startWatch(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { movie_id, device } = req.body;
    if (!movie_id) {
      return res.status(400).json({ error: "movie_id required" });
    }
    const [result] = await pool.query(
      "INSERT INTO watch_history (user_id, movie_id, device) VALUES (?, ?, ?)",
      [userId, movie_id, device || null]
    );
    return res.status(201).json({ watch_id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

export async function updateWatch(req, res, next) {
  try {
    const userId = req.user.user_id;
    const watchId = Number(req.params.watchId);
    const { watch_seconds, progress, is_finished } = req.body;
    const fields = [];
    const params = [];
    if (watch_seconds !== undefined) {
      fields.push("watch_seconds = ?");
      params.push(watch_seconds);
    }
    if (progress !== undefined) {
      fields.push("progress = ?");
      params.push(progress);
    }
    if (is_finished !== undefined) {
      fields.push("is_finished = ?");
      params.push(is_finished ? 1 : 0);
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: "no fields to update" });
    }
    params.push(watchId, userId);
    const [result] = await pool.query(
      `UPDATE watch_history SET ${fields.join(", ")} WHERE watch_id = ? AND user_id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "watch record not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function listWatchHistory(req, res, next) {
  try {
    const userId = req.user.user_id;
    const [rows] = await pool.query(
      "SELECT w.*, m.title, m.poster_url FROM watch_history w JOIN movies m ON w.movie_id = m.movie_id WHERE w.user_id = ? ORDER BY w.watched_at DESC LIMIT 50",
      [userId]
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}
