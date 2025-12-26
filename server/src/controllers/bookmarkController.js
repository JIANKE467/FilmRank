import pool from "../db/pool.js";

export async function upsertBookmark(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { movie_id, note, type } = req.body;
    if (!movie_id) {
      return res.status(400).json({ error: "movie_id required" });
    }
    const cleanNote = typeof note === "string" ? note.trim() : "";
    const kind = type === "note" ? "note" : "favorite";
    if (kind === "note" && !cleanNote) {
      return res.status(400).json({ error: "note required" });
    }
    const [[existing]] = await pool.query(
      "SELECT bookmark_id FROM bookmarks WHERE user_id = ? AND movie_id = ?",
      [userId, movie_id]
    );
    if (existing) {
      try {
        await pool.query(
          "UPDATE bookmarks SET note = ?, kind = ?, updated_at = CURRENT_TIMESTAMP WHERE bookmark_id = ?",
          [kind === "note" ? cleanNote : null, kind, existing.bookmark_id]
        );
      } catch {
        await pool.query(
          "UPDATE bookmarks SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE bookmark_id = ?",
          [kind === "note" ? cleanNote : null, existing.bookmark_id]
        );
      }
      return res.json({ ok: true, updated: true });
    }
    try {
      await pool.query(
        "INSERT INTO bookmarks (user_id, movie_id, note, kind) VALUES (?, ?, ?, ?)",
        [userId, movie_id, kind === "note" ? cleanNote : null, kind]
      );
    } catch {
      await pool.query(
        "INSERT INTO bookmarks (user_id, movie_id, note) VALUES (?, ?, ?)",
        [userId, movie_id, kind === "note" ? cleanNote : null]
      );
    }
    return res.status(201).json({ ok: true, updated: false });
  } catch (err) {
    return next(err);
  }
}

export async function getBookmark(req, res, next) {
  try {
    const userId = req.user.user_id;
    const movieId = Number(req.params.movieId);
    let bookmark;
    try {
      [[bookmark]] = await pool.query(
        "SELECT bookmark_id, note, updated_at, kind FROM bookmarks WHERE user_id = ? AND movie_id = ?",
        [userId, movieId]
      );
    } catch {
      [[bookmark]] = await pool.query(
        "SELECT bookmark_id, note, updated_at FROM bookmarks WHERE user_id = ? AND movie_id = ?",
        [userId, movieId]
      );
    }
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

export async function listBookmarks(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { page, page_size, type } = req.query;
    const rawLimit = Number(page_size || 8);
    const pageSize = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 8;
    const rawPage = Number(page || 1);
    const pageNumber = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const offset = (pageNumber - 1) * pageSize;

    let filterSql = "";
    const params = [userId];
    if (type === "note") {
      filterSql = " AND b.kind = 'note'";
    } else if (type === "favorite") {
      filterSql = " AND b.kind = 'favorite'";
    }

    try {
      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM bookmarks b WHERE b.user_id = ?${filterSql}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT b.bookmark_id, b.movie_id, b.note, b.kind, b.updated_at, m.title, m.poster_url
         FROM bookmarks b
         JOIN movies m ON b.movie_id = m.movie_id
         WHERE b.user_id = ?${filterSql}
         ORDER BY b.updated_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      return res.json({ items: rows, total: countRow?.total || 0 });
    } catch {
      if (type === "note") {
        filterSql = " AND b.note IS NOT NULL AND b.note <> ''";
      } else if (type === "favorite") {
        filterSql = " AND (b.note IS NULL OR b.note = '')";
      } else {
        filterSql = "";
      }
      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM bookmarks b WHERE b.user_id = ?${filterSql}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT b.bookmark_id, b.movie_id, b.note, b.updated_at, m.title, m.poster_url
         FROM bookmarks b
         JOIN movies m ON b.movie_id = m.movie_id
         WHERE b.user_id = ?${filterSql}
         ORDER BY b.updated_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      return res.json({ items: rows, total: countRow?.total || 0 });
    }
  } catch (err) {
    return next(err);
  }
}
