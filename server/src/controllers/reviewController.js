import pool from "../db/pool.js";

export async function createReview(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { movie_id, content } = req.body;
    if (!movie_id || !content) {
      return res.status(400).json({ error: "movie_id and content required" });
    }
    const [result] = await pool.query(
      "INSERT INTO reviews (user_id, movie_id, content) VALUES (?, ?, ?)",
      [userId, movie_id, content]
    );
    return res.status(201).json({ review_id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

export async function updateReview(req, res, next) {
  try {
    const userId = req.user.user_id;
    const reviewId = Number(req.params.reviewId);
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "content required" });
    }
    const [result] = await pool.query(
      "UPDATE reviews SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE review_id = ? AND user_id = ?",
      [content, reviewId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "review not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const userId = req.user.user_id;
    const reviewId = Number(req.params.reviewId);
    const [result] = await pool.query(
      "DELETE FROM reviews WHERE review_id = ? AND user_id = ?",
      [reviewId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "review not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function adminHideReview(req, res, next) {
  try {
    const reviewId = Number(req.params.reviewId);
    const { status } = req.body;
    if (!status || !["visible", "hidden"].includes(status)) {
      return res.status(400).json({ error: "status must be visible or hidden" });
    }
    const [result] = await pool.query(
      "UPDATE reviews SET status = ? WHERE review_id = ?",
      [status, reviewId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "review not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
