import pool from "../db/pool.js";

export async function listMovies(req, res, next) {
  try {
    const {
      q,
      year,
      genre_id,
      country,
      language,
      min_runtime,
      max_runtime,
      sort
    } = req.query;

    const params = [];
    let sql = "SELECT m.* FROM movies m";

    if (genre_id) {
      sql += " JOIN movie_genres mg ON m.movie_id = mg.movie_id";
    }

    sql += " WHERE m.status = 'active'";

    if (q) {
      sql += " AND (m.title LIKE ? OR m.original_title LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
    if (year) {
      sql += " AND m.year = ?";
      params.push(Number(year));
    }
    if (genre_id) {
      sql += " AND mg.genre_id = ?";
      params.push(Number(genre_id));
    }
    if (country) {
      sql += " AND m.country = ?";
      params.push(country);
    }
    if (language) {
      sql += " AND m.language = ?";
      params.push(language);
    }
    if (min_runtime) {
      sql += " AND m.runtime_minutes >= ?";
      params.push(Number(min_runtime));
    }
    if (max_runtime) {
      sql += " AND m.runtime_minutes <= ?";
      params.push(Number(max_runtime));
    }

    if (sort === "latest") {
      sql += " ORDER BY m.release_date DESC";
    } else if (sort === "top") {
      sql += " ORDER BY m.movie_id DESC";
    } else {
      sql += " ORDER BY m.movie_id DESC";
    }

    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function getMovie(req, res, next) {
  try {
    const movieId = Number(req.params.movieId);
    const [[movie]] = await pool.query("SELECT * FROM movies WHERE movie_id = ?", [movieId]);
    if (!movie) {
      return res.status(404).json({ error: "movie not found" });
    }
    const [genres] = await pool.query(
      "SELECT g.genre_id, g.name FROM movie_genres mg JOIN genres g ON mg.genre_id = g.genre_id WHERE mg.movie_id = ?",
      [movieId]
    );
    const [[ratingStats]] = await pool.query(
      "SELECT AVG(score) AS avg_score, COUNT(*) AS rating_count FROM ratings WHERE movie_id = ?",
      [movieId]
    );
    const [reviews] = await pool.query(
      "SELECT r.review_id, r.content, r.created_at, u.username FROM reviews r JOIN users u ON r.user_id = u.user_id WHERE r.movie_id = ? AND r.status = 'visible' ORDER BY r.created_at DESC",
      [movieId]
    );

    return res.json({
      movie,
      genres,
      rating: ratingStats || { avg_score: null, rating_count: 0 },
      reviews
    });
  } catch (err) {
    return next(err);
  }
}

export async function createMovie(req, res, next) {
  try {
    const {
      title,
      original_title,
      release_date,
      year,
      runtime_minutes,
      language,
      country,
      description,
      poster_url,
      status
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title required" });
    }

    const [result] = await pool.query(
      `INSERT INTO movies
      (title, original_title, release_date, year, runtime_minutes, language, country, description, poster_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        original_title || null,
        release_date || null,
        year || null,
        runtime_minutes || null,
        language || null,
        country || null,
        description || null,
        poster_url || null,
        status || "active"
      ]
    );

    return res.status(201).json({ movie_id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

export async function updateMovie(req, res, next) {
  try {
    const movieId = Number(req.params.movieId);
    const fields = [
      "title",
      "original_title",
      "release_date",
      "year",
      "runtime_minutes",
      "language",
      "country",
      "description",
      "poster_url",
      "status"
    ];
    const updates = [];
    const params = [];
    for (const field of fields) {
      if (field in req.body) {
        updates.push(`${field} = ?`);
        params.push(req.body[field] ?? null);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "no fields to update" });
    }
    params.push(movieId);
    const [result] = await pool.query(
      `UPDATE movies SET ${updates.join(", ")} WHERE movie_id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "movie not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function bindGenres(req, res, next) {
  try {
    const movieId = Number(req.params.movieId);
    const { genre_ids } = req.body;
    if (!Array.isArray(genre_ids)) {
      return res.status(400).json({ error: "genre_ids must be array" });
    }
    await pool.query("DELETE FROM movie_genres WHERE movie_id = ?", [movieId]);
    for (const gid of genre_ids) {
      await pool.query("INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)", [movieId, gid]);
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
