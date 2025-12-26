import pool from "../db/pool.js";

export async function getUserStats(req, res, next) {
  try {
    const userId = req.user.user_id;
    let bookmarkRow = { bookmark_count: 0 };
    try {
      const [[row]] = await pool.query(
        "SELECT COUNT(*) AS bookmark_count FROM bookmarks WHERE user_id = ?",
        [userId]
      );
      bookmarkRow = row || bookmarkRow;
    } catch {
      bookmarkRow = { bookmark_count: 0 };
    }
    const [[reviewRow]] = await pool.query(
      "SELECT COUNT(*) AS review_count FROM reviews WHERE user_id = ?",
      [userId]
    );
    return res.json({
      bookmark_count: bookmarkRow?.bookmark_count || 0,
      review_count: reviewRow?.review_count || 0
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const userId = req.user.user_id;
    const [[user]] = await pool.query(
      "SELECT user_id, username, email, role, bio FROM users WHERE user_id = ?",
      [userId]
    );
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }
    return res.json(user);
  } catch (err) {
    return next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { bio } = req.body;
    await pool.query("UPDATE users SET bio = ? WHERE user_id = ?", [bio || null, userId]);
    const [[user]] = await pool.query(
      "SELECT user_id, username, email, role, bio FROM users WHERE user_id = ?",
      [userId]
    );
    return res.json(user);
  } catch (err) {
    return next(err);
  }
}
