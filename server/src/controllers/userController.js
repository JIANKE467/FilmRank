import pool from "../db/pool.js";

export async function getUserStats(req, res, next) {
  try {
    const userId = req.user.user_id;
    const [[ratingRow]] = await pool.query(
      "SELECT COUNT(*) AS rating_count FROM ratings WHERE user_id = ?",
      [userId]
    );
    const [[reviewRow]] = await pool.query(
      "SELECT COUNT(*) AS review_count FROM reviews WHERE user_id = ?",
      [userId]
    );
    return res.json({
      rating_count: ratingRow?.rating_count || 0,
      review_count: reviewRow?.review_count || 0
    });
  } catch (err) {
    return next(err);
  }
}
