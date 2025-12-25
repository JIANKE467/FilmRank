import pool from "../db/pool.js";

export async function listGenres(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT * FROM genres ORDER BY name ASC");
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function createGenre(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name required" });
    }
    const [result] = await pool.query("INSERT INTO genres (name) VALUES (?)", [name]);
    return res.status(201).json({ genre_id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

export async function updateGenre(req, res, next) {
  try {
    const genreId = Number(req.params.genreId);
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name required" });
    }
    const [result] = await pool.query("UPDATE genres SET name = ? WHERE genre_id = ?", [name, genreId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "genre not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
