import pool from "../db/pool.js";

export async function upsertBookmark(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { movie_id, note } = req.body;
    if (!movie_id) {
      return res.status(400).json({ error: "movie_id required" });
    }
    const [[existing]] = await pool.query(
      "SELECT bookmark_id FROM bookmarks WHERE user_id = ? AND movie_id = ?",
      [userId, movie_id]
    );
    if (existing) {
      await pool.query(
        "UPDATE bookmarks SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE bookmark_id = ?",
        [note || null, existing.bookmark_id]
      );
      return res.json({ ok: true, updated: true });
    }
    await pool.query(
      "INSERT INTO bookmarks (user_id, movie_id, note) VALUES (?, ?, ?)",
      [userId, movie_id, note || null]
    );
    return res.status(201).json({ ok: true, updated: false });
  } catch (err) {
    return next(err);
  }
}

export async function getBookmark(req, res, next) {
  try {
    const userId = req.user.user_id;
    const movieId = Number(req.params.movieId);
    const [[bookmark]] = await pool.query(
      "SELECT bookmark_id, note, updated_at FROM bookmarks WHERE user_id = ? AND movie_id = ?",
      [userId, movieId]
    );
    return res.json(bookmark || null);
  } catch (err) {
    return next(err);
  }
}

export async function deleteBookmark(req, res, next) {
  try {
    const userId = req.user.user_id;
    const movieId = Number(req.params.movieId);
    const [result] = await pool.query(
      "DELETE FROM bookmarks WHERE user_id = ? AND movie_id = ?",
      [userId, movieId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "bookmark not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
