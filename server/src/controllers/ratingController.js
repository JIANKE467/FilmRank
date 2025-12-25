import pool from "../db/pool.js";

async function getActivePolicy() {
  const [[policy]] = await pool.query(
    "SELECT * FROM rating_policy WHERE is_active = TRUE ORDER BY effective_from DESC LIMIT 1"
  );
  return policy;
}

function isValidScore(score, policy) {
  if (!policy) {
    return true;
  }
  const min = Number(policy.min_score);
  const max = Number(policy.max_score);
  const step = Number(policy.step);
  const val = Number(score);
  if (Number.isNaN(val)) return false;
  if (val < min || val > max) return false;
  if (step > 0) {
    const diff = Math.round((val - min) / step);
    const expected = min + diff * step;
    return Math.abs(expected - val) < 1e-6;
  }
  return true;
}

export async function rateMovie(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { movie_id, score } = req.body;
    if (!movie_id || score === undefined) {
      return res.status(400).json({ error: "movie_id and score required" });
    }
    const policy = await getActivePolicy();
    if (!isValidScore(score, policy)) {
      return res.status(400).json({ error: "score not allowed by policy" });
    }
    const [[existing]] = await pool.query(
      "SELECT rating_id FROM ratings WHERE user_id = ? AND movie_id = ?",
      [userId, movie_id]
    );
    if (existing) {
      if (policy && policy.allow_update === 0) {
        return res.status(409).json({ error: "update not allowed" });
      }
      await pool.query(
        "UPDATE ratings SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE rating_id = ?",
        [score, existing.rating_id]
      );
      return res.json({ ok: true, updated: true });
    }
    await pool.query(
      "INSERT INTO ratings (user_id, movie_id, score) VALUES (?, ?, ?)",
      [userId, movie_id, score]
    );
    return res.status(201).json({ ok: true, updated: false });
  } catch (err) {
    return next(err);
  }
}

export async function deleteRating(req, res, next) {
  try {
    const userId = req.user.user_id;
    const ratingId = Number(req.params.ratingId);
    const [result] = await pool.query(
      "DELETE FROM ratings WHERE rating_id = ? AND user_id = ?",
      [ratingId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "rating not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
