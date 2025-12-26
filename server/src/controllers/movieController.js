import pool from "../db/pool.js";
import {
  searchTmdbMovies,
  getTmdbGenreMap,
  buildTmdbPosterUrl,
  buildTmdbBackdropUrl,
  buildTmdbProfileUrl,
  getTmdbMovieDetails,
  getTmdbMovieCredits,
  getTmdbMovieKeywords,
  getTmdbMovieReviews,
  listTmdbCategory
} from "../services/tmdb.js";

const DEFAULT_TMDB_CACHE_DAYS = 30;

function getTmdbCacheDays() {
  const raw = Number(process.env.TMDB_CACHE_DAYS);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return DEFAULT_TMDB_CACHE_DAYS;
}

async function cleanupOldTmdbMovies() {
  const days = getTmdbCacheDays();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await pool.query(
    `DELETE m FROM movies m
     LEFT JOIN ratings r ON m.movie_id = r.movie_id
     LEFT JOIN reviews rv ON m.movie_id = rv.movie_id
     LEFT JOIN watch_history w ON m.movie_id = w.movie_id
     WHERE m.source = 'tmdb'
       AND m.last_fetched_at IS NOT NULL
       AND m.last_fetched_at < ?
       AND r.movie_id IS NULL
       AND rv.movie_id IS NULL
       AND w.movie_id IS NULL`,
    [cutoff]
  );
}

async function ensureGenresByName(names) {
  if (!names.length) {
    return new Map();
  }
  const valuesSql = names.map(() => "(?)").join(", ");
  await pool.query(`INSERT IGNORE INTO genres (name) VALUES ${valuesSql}`, names);
  const placeholders = names.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT genre_id, name FROM genres WHERE name IN (${placeholders})`,
    names
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.name, row.genre_id);
  }
  return map;
}

async function upsertTmdbMovies(tmdbMovies, language) {
  if (!tmdbMovies.length) {
    return [];
  }
  const genreMap = await getTmdbGenreMap(language);
  const now = new Date();
  const genreNames = new Set();
  for (const movie of tmdbMovies) {
    if (Array.isArray(movie.genre_ids)) {
      for (const gid of movie.genre_ids) {
        const name = genreMap.get(gid);
        if (name) {
          genreNames.add(name);
        }
      }
    }
  }
  const genreIdByName = await ensureGenresByName([...genreNames]);
  const savedIds = [];

  for (const movie of tmdbMovies) {
    const releaseDate = movie.release_date || null;
    const year = releaseDate ? Number(releaseDate.slice(0, 4)) : null;
    const posterUrl = buildTmdbPosterUrl(movie.poster_path);
    const backdropUrl = buildTmdbBackdropUrl(movie.backdrop_path);
    let result;
    try {
      [result] = await pool.query(
        `INSERT INTO movies
          (tmdb_id, title, original_title, release_date, year, runtime_minutes, language, country, description, poster_url, backdrop_url, tmdb_vote_average, tmdb_vote_count, tmdb_revenue, source, last_fetched_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tmdb', ?, 'active')
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           original_title = VALUES(original_title),
           release_date = VALUES(release_date),
           year = VALUES(year),
           language = VALUES(language),
           description = VALUES(description),
           poster_url = VALUES(poster_url),
           backdrop_url = VALUES(backdrop_url),
           tmdb_vote_average = VALUES(tmdb_vote_average),
           tmdb_vote_count = VALUES(tmdb_vote_count),
           last_fetched_at = VALUES(last_fetched_at),
           status = 'active',
           movie_id = LAST_INSERT_ID(movie_id)`,
        [
          movie.id,
          movie.title || movie.original_title || "Unknown",
          movie.original_title || null,
          releaseDate,
          Number.isFinite(year) ? year : null,
          null,
          movie.original_language || null,
          null,
          movie.overview || null,
          posterUrl,
          backdropUrl,
          Number.isFinite(Number(movie.vote_average)) ? Number(movie.vote_average) : null,
          Number.isFinite(Number(movie.vote_count)) ? Number(movie.vote_count) : null,
          null,
          now
        ]
      );
    } catch (err) {
      // If schema isn't migrated yet, skip TMDB upsert instead of failing the request.
      continue;
    }

    const movieId = result.insertId;
    savedIds.push(movieId);

    await pool.query("DELETE FROM movie_genres WHERE movie_id = ?", [movieId]);
    if (Array.isArray(movie.genre_ids)) {
      for (const gid of movie.genre_ids) {
        const name = genreMap.get(gid);
        const localId = name ? genreIdByName.get(name) : null;
        if (localId) {
          await pool.query(
            "INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)",
            [movieId, localId]
          );
        }
      }
    }
  }

  if (!savedIds.length) {
    return [];
  }
  const placeholders = savedIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT m.* FROM movies m WHERE m.movie_id IN (${placeholders})`,
    savedIds
  );
  return rows;
}

async function syncTmdbMovieExtras(movie) {
  if (!movie?.tmdb_id) {
    return;
  }
  const tmdbLanguage = movie.language || process.env.TMDB_LANGUAGE || "zh-CN";
  const details = await getTmdbMovieDetails(movie.tmdb_id, tmdbLanguage);
  const credits = await getTmdbMovieCredits(movie.tmdb_id, tmdbLanguage);
  const keywords = await getTmdbMovieKeywords(movie.tmdb_id);

  const posterUrl = buildTmdbPosterUrl(details.poster_path);
  const backdropUrl = buildTmdbBackdropUrl(details.backdrop_path);
  const revenue = Number.isFinite(Number(details.revenue)) ? Number(details.revenue) : null;
  const voteAverage = Number.isFinite(Number(details.vote_average)) ? Number(details.vote_average) : null;
  const voteCount = Number.isFinite(Number(details.vote_count)) ? Number(details.vote_count) : null;
  const runtime = Number.isFinite(Number(details.runtime)) ? Number(details.runtime) : null;

  try {
    await pool.query(
      `UPDATE movies
       SET runtime_minutes = COALESCE(?, runtime_minutes),
           description = COALESCE(?, description),
           poster_url = COALESCE(?, poster_url),
           backdrop_url = COALESCE(?, backdrop_url),
           tmdb_revenue = COALESCE(?, tmdb_revenue),
           tmdb_vote_average = COALESCE(?, tmdb_vote_average),
           tmdb_vote_count = COALESCE(?, tmdb_vote_count),
           last_fetched_at = ?
       WHERE movie_id = ?`,
      [
        runtime,
        details.overview || null,
        posterUrl,
        backdropUrl,
        revenue,
        voteAverage,
        voteCount,
        new Date(),
        movie.movie_id
      ]
    );
  } catch {
    // Ignore if schema isn't migrated yet.
  }
  try {
    await pool.query("DELETE FROM movie_keywords WHERE movie_id = ?", [movie.movie_id]);
    if (Array.isArray(keywords)) {
      for (const keyword of keywords) {
        if (keyword?.id && keyword?.name) {
          await pool.query(
            "INSERT INTO movie_keywords (movie_id, keyword_id, name) VALUES (?, ?, ?)",
            [movie.movie_id, keyword.id, keyword.name]
          );
        }
      }
    }
  } catch {
    // Ignore if keywords table doesn't exist yet.
  }

  try {
    await pool.query("DELETE FROM movie_cast WHERE movie_id = ?", [movie.movie_id]);
    const castList = Array.isArray(credits?.cast) ? credits.cast.slice(0, 12) : [];
    for (const cast of castList) {
      if (!cast?.id || !cast?.name) continue;
      await pool.query(
        "INSERT INTO movie_cast (movie_id, cast_id, name, character_name, profile_url, cast_order) VALUES (?, ?, ?, ?, ?, ?)",
        [
          movie.movie_id,
          cast.id,
          cast.name,
          cast.character || null,
          buildTmdbProfileUrl(cast.profile_path),
          Number.isFinite(Number(cast.order)) ? Number(cast.order) : null
        ]
      );
    }
  } catch {
    // Ignore if cast table doesn't exist yet.
  }

  try {
    await pool.query("DELETE FROM movie_crew WHERE movie_id = ?", [movie.movie_id]);
    const crewList = Array.isArray(credits?.crew) ? credits.crew : [];
    const directors = crewList.filter((member) => member?.job === "Director").slice(0, 3);
    for (const crew of directors) {
      if (!crew?.id || !crew?.name) continue;
      await pool.query(
        "INSERT INTO movie_crew (movie_id, crew_id, name, job, profile_url) VALUES (?, ?, ?, ?, ?)",
        [
          movie.movie_id,
          crew.id,
          crew.name,
          crew.job || null,
          buildTmdbProfileUrl(crew.profile_path)
        ]
      );
    }
  } catch {
    // Ignore if crew table doesn't exist yet.
  }
}

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
      sort,
      page,
      page_size,
      limit,
      tmdb_category
    } = req.query;

    if (tmdb_category) {
      const tmdbLanguage = language || process.env.TMDB_LANGUAGE || "zh-CN";
      const tmdbPage = Number(page || 1);
      const tmdbMovies = await listTmdbCategory(String(tmdb_category), tmdbLanguage, tmdbPage);
      const savedRows = await upsertTmdbMovies(tmdbMovies, tmdbLanguage);
      return res.json(savedRows.slice(0, Number(limit || page_size || 12)));
    }

    const rawLimit = Number(limit || page_size || 24);
    const pageSize = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 24;
    const rawPage = Number(page || 1);
    const pageNumber = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const offset = (pageNumber - 1) * pageSize;

    const params = [];
    const needsMetrics = sort === "hot" || sort === "rating";
    const selectFields = ["m.*"];
    if (needsMetrics) {
      selectFields.push(
        "COALESCE(w.watch_count, 0) AS watch_count",
        "COALESCE(rt.avg_score, 0) AS avg_score",
        "COALESCE(rt.rating_count, 0) AS rating_count"
      );
    }
    let sql = `SELECT ${selectFields.join(", ")} FROM movies m`;

    if (needsMetrics) {
      sql +=
        " LEFT JOIN (SELECT movie_id, COUNT(*) AS watch_count FROM watch_history GROUP BY movie_id) w ON m.movie_id = w.movie_id" +
        " LEFT JOIN (SELECT movie_id, AVG(score) AS avg_score, COUNT(*) AS rating_count FROM ratings GROUP BY movie_id) rt ON m.movie_id = rt.movie_id";
    }

    if (genre_id) {
      sql += " JOIN movie_genres mg ON m.movie_id = mg.movie_id";
    }

    sql += " WHERE m.status = 'active'";

    if (q) {
      sql +=
        " AND (m.title LIKE ? OR m.original_title LIKE ?" +
        " OR EXISTS (SELECT 1 FROM movie_cast mc WHERE mc.movie_id = m.movie_id AND (mc.name LIKE ? OR mc.character_name LIKE ?))" +
        " OR EXISTS (SELECT 1 FROM movie_crew cr WHERE cr.movie_id = m.movie_id AND cr.job = 'Director' AND cr.name LIKE ?))";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
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
    } else if (sort === "hot") {
      sql += " ORDER BY watch_count DESC, m.movie_id DESC";
    } else if (sort === "rating") {
      sql += " ORDER BY avg_score DESC, rating_count DESC, m.movie_id DESC";
    } else if (sort === "top") {
      sql += " ORDER BY m.movie_id DESC";
    } else {
      sql += " ORDER BY m.movie_id DESC";
    }

    sql += " LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    const [rows] = await pool.query(sql, params);

    if (q && rows.length === 0 && pageNumber === 1) {
      const tmdbLanguage = language || process.env.TMDB_LANGUAGE || "zh-CN";
      const tmdbMovies = await searchTmdbMovies({ query: q, year, language: tmdbLanguage });
      const savedRows = await upsertTmdbMovies(tmdbMovies, tmdbLanguage);
      await cleanupOldTmdbMovies();
      return res.json(savedRows.slice(0, pageSize));
    }

    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function getMovie(req, res, next) {
  try {
    const movieId = Number(req.params.movieId);
    let [[movie]] = await pool.query("SELECT * FROM movies WHERE movie_id = ?", [movieId]);
    if (!movie) {
      return res.status(404).json({ error: "movie not found" });
    }

    if (movie.source === "tmdb") {
      const cutoff = new Date(Date.now() - getTmdbCacheDays() * 24 * 60 * 60 * 1000);
      const needsRefresh = !movie.last_fetched_at || new Date(movie.last_fetched_at) < cutoff;
      const needsExtras =
        movie.tmdb_revenue === null ||
        movie.tmdb_vote_average === null ||
        movie.tmdb_vote_count === null;
      if (needsRefresh || needsExtras) {
        try {
          await syncTmdbMovieExtras(movie);
          [[movie]] = await pool.query("SELECT * FROM movies WHERE movie_id = ?", [movieId]);
        } catch (err) {
          // Fallback to existing data if TMDB fetch fails.
        }
      }
    }
    const [genres] = await pool.query(
      "SELECT g.genre_id, g.name FROM movie_genres mg JOIN genres g ON mg.genre_id = g.genre_id WHERE mg.movie_id = ?",
      [movieId]
    );
    const ratingStats = {
      avg_score: movie.tmdb_vote_average ?? null,
      rating_count: movie.tmdb_vote_count ?? 0
    };
    let reviewCount = 0;
    let reviews = [];
    if (movie.source === "tmdb" && movie.tmdb_id) {
      try {
        const tmdbLanguage = movie.language || process.env.TMDB_LANGUAGE || "zh-CN";
        const tmdbReviews = await getTmdbMovieReviews(movie.tmdb_id, tmdbLanguage);
        reviewCount = tmdbReviews.total;
        reviews = tmdbReviews.results.map((item) => ({
          review_id: item.id,
          content: item.content,
          created_at: item.created_at,
          username: item.author || "TMDB User"
        }));
      } catch {
        reviewCount = 0;
        reviews = [];
      }
    } else {
      const [[reviewRow]] = await pool.query(
        "SELECT COUNT(*) AS review_count FROM reviews WHERE movie_id = ? AND status = 'visible'",
        [movieId]
      );
      reviewCount = reviewRow?.review_count || 0;
      const [rows] = await pool.query(
        "SELECT r.review_id, r.content, r.created_at, u.username FROM reviews r JOIN users u ON r.user_id = u.user_id WHERE r.movie_id = ? AND r.status = 'visible' ORDER BY r.created_at DESC",
        [movieId]
      );
      reviews = rows;
    }

    let keywords = [];
    let cast = [];
    try {
      [keywords] = await pool.query(
        "SELECT keyword_id, name FROM movie_keywords WHERE movie_id = ? ORDER BY name ASC",
        [movieId]
      );
    } catch {
      keywords = [];
    }
    try {
      [cast] = await pool.query(
        "SELECT cast_id, name, character_name, profile_url, cast_order FROM movie_cast WHERE movie_id = ? ORDER BY cast_order ASC, name ASC",
        [movieId]
      );
    } catch {
      cast = [];
    }

    let related = [];
    if (genres.length > 0) {
      const [relatedRows] = await pool.query(
        `SELECT DISTINCT m.movie_id, m.title, m.poster_url, m.year, m.language, m.release_date
         FROM movies m
         JOIN movie_genres mg ON m.movie_id = mg.movie_id
         WHERE mg.genre_id = ?
           AND m.status = 'active'
           AND m.movie_id <> ?
         ORDER BY m.release_date DESC
         LIMIT 6`,
        [genres[0].genre_id, movieId]
      );
      related = relatedRows;
    }

    return res.json({
      movie,
      genres,
      rating: ratingStats,
      review_count: reviewCount,
      reviews,
      related,
      keywords,
      cast
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
