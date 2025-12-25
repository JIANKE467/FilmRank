import pool from "../db/pool.js";

async function createBatch(algorithm, paramsJson, status = "success") {
  const [result] = await pool.query(
    "INSERT INTO recommendation_batches (algorithm, params_json, status) VALUES (?, ?, ?)",
    [algorithm, paramsJson ? JSON.stringify(paramsJson) : null, status]
  );
  return result.insertId;
}

async function getActiveUsers() {
  const [rows] = await pool.query(
    "SELECT user_id FROM users WHERE status = 'active' AND role = 'user'"
  );
  return rows.map((row) => row.user_id);
}

async function getHotMovies(topN) {
  const [rows] = await pool.query(
    "SELECT movie_id, COUNT(*) AS score FROM watch_history WHERE watched_at >= (NOW() - INTERVAL 7 DAY) GROUP BY movie_id ORDER BY score DESC LIMIT ?",
    [topN]
  );
  if (rows.length === 0) {
    const [fallback] = await pool.query(
      "SELECT movie_id, COUNT(*) AS score FROM ratings GROUP BY movie_id ORDER BY score DESC LIMIT ?",
      [topN]
    );
    return fallback;
  }
  return rows;
}

async function getUserTopGenres(userId) {
  const [ratingGenres] = await pool.query(
    "SELECT mg.genre_id, COUNT(*) AS cnt FROM ratings r JOIN movie_genres mg ON r.movie_id = mg.movie_id WHERE r.user_id = ? GROUP BY mg.genre_id ORDER BY cnt DESC LIMIT 3",
    [userId]
  );
  if (ratingGenres.length > 0) {
    return ratingGenres.map((row) => row.genre_id);
  }
  const [watchGenres] = await pool.query(
    "SELECT mg.genre_id, COUNT(*) AS cnt FROM watch_history w JOIN movie_genres mg ON w.movie_id = mg.movie_id WHERE w.user_id = ? GROUP BY mg.genre_id ORDER BY cnt DESC LIMIT 3",
    [userId]
  );
  return watchGenres.map((row) => row.genre_id);
}

async function getContentCandidates(userId, genreIds, topN) {
  if (genreIds.length === 0) return [];
  const placeholders = genreIds.map(() => "?").join(",");
  const sql = `
    SELECT DISTINCT m.movie_id
    FROM movies m
    JOIN movie_genres mg ON m.movie_id = mg.movie_id
    WHERE m.status = 'active'
      AND mg.genre_id IN (${placeholders})
      AND m.movie_id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
      AND m.movie_id NOT IN (SELECT movie_id FROM watch_history WHERE user_id = ?)
    LIMIT ?`;
  const params = [...genreIds, userId, userId, topN];
  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({ movie_id: row.movie_id, score: 1, reason: "Similar genres" }));
}

function buildRatingMaps(ratings) {
  const userRatings = new Map();
  const movieUsers = new Map();
  for (const r of ratings) {
    if (!userRatings.has(r.user_id)) {
      userRatings.set(r.user_id, new Map());
    }
    userRatings.get(r.user_id).set(r.movie_id, Number(r.score));
    if (!movieUsers.has(r.movie_id)) {
      movieUsers.set(r.movie_id, new Set());
    }
    movieUsers.get(r.movie_id).add(r.user_id);
  }
  return { userRatings, movieUsers };
}

function cosineSimilarity(mapA, mapB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const val of mapA.values()) {
    normA += val * val;
  }
  for (const val of mapB.values()) {
    normB += val * val;
  }
  for (const [movieId, scoreA] of mapA.entries()) {
    const scoreB = mapB.get(movieId);
    if (scoreB !== undefined) {
      dot += scoreA * scoreB;
    }
  }
  if (dot === 0 || normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getTopNFromMap(scoreMap, topN) {
  return Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([movie_id, score]) => ({ movie_id, score }));
}

async function getCFRecommendations(topN) {
  const [ratings] = await pool.query("SELECT user_id, movie_id, score FROM ratings");
  if (ratings.length === 0) return new Map();

  const { userRatings } = buildRatingMaps(ratings);
  const userIds = Array.from(userRatings.keys());
  const recMap = new Map();

  for (const userId of userIds) {
    const targetRatings = userRatings.get(userId);
    const scoreSums = new Map();
    const weightSums = new Map();

    for (const otherId of userIds) {
      if (otherId === userId) continue;
      const otherRatings = userRatings.get(otherId);
      const sim = cosineSimilarity(targetRatings, otherRatings);
      if (sim <= 0) continue;

      for (const [movieId, score] of otherRatings.entries()) {
        if (targetRatings.has(movieId)) continue;
        const prevScore = scoreSums.get(movieId) || 0;
        const prevWeight = weightSums.get(movieId) || 0;
        scoreSums.set(movieId, prevScore + sim * score);
        weightSums.set(movieId, prevWeight + sim);
      }
    }

    const predicted = new Map();
    for (const [movieId, sum] of scoreSums.entries()) {
      const weight = weightSums.get(movieId) || 1;
      predicted.set(movieId, sum / weight);
    }

    const top = getTopNFromMap(predicted, topN).map((item) => ({
      ...item,
      reason: "Similar users liked this"
    }));

    recMap.set(userId, top);
  }
  return recMap;
}

async function getHybridRecommendations(topN) {
  const users = await getActiveUsers();
  const hot = await getHotMovies(topN);
  const cfMap = await getCFRecommendations(topN);
  const result = new Map();

  for (const userId of users) {
    const contentGenres = await getUserTopGenres(userId);
    const content = await getContentCandidates(userId, contentGenres, topN);
    const cf = cfMap.get(userId) || [];

    const scoreMap = new Map();
    for (const item of hot) {
      scoreMap.set(item.movie_id, (scoreMap.get(item.movie_id) || 0) + item.score * 0.2);
    }
    for (const item of content) {
      scoreMap.set(item.movie_id, (scoreMap.get(item.movie_id) || 0) + item.score * 0.4);
    }
    for (const item of cf) {
      scoreMap.set(item.movie_id, (scoreMap.get(item.movie_id) || 0) + item.score * 0.4);
    }

    const top = getTopNFromMap(scoreMap, topN).map((item) => ({
      ...item,
      reason: "Hybrid recommendation"
    }));
    result.set(userId, top);
  }

  return result;
}

async function insertRecommendations(batchId, userRecs) {
  const values = [];
  for (const [userId, recs] of userRecs.entries()) {
    let rank = 1;
    for (const rec of recs) {
      values.push([batchId, userId, rec.movie_id, rank, rec.score, rec.reason || null]);
      rank += 1;
    }
  }
  if (values.length === 0) return;
  await pool.query(
    "INSERT INTO recommendations (batch_id, user_id, movie_id, rank, score, reason) VALUES ?",
    [values]
  );
}

export async function generateBatch(req, res, next) {
  try {
    const { algorithm, top_n } = req.body;
    const topN = Number(top_n || 10);
    if (!algorithm || !["cf", "content", "hot", "hybrid"].includes(algorithm)) {
      return res.status(400).json({ error: "invalid algorithm" });
    }

    const batchId = await createBatch(algorithm, { top_n: topN });
    const users = await getActiveUsers();
    const userRecs = new Map();

    if (algorithm === "hot") {
      const hot = await getHotMovies(topN);
      for (const userId of users) {
        userRecs.set(
          userId,
          hot.map((item, idx) => ({
            movie_id: item.movie_id,
            score: item.score,
            reason: "Hot in last 7 days",
            rank: idx + 1
          }))
        );
      }
    }

    if (algorithm === "content") {
      for (const userId of users) {
        const genreIds = await getUserTopGenres(userId);
        const recs = await getContentCandidates(userId, genreIds, topN);
        userRecs.set(userId, recs);
      }
    }

    if (algorithm === "cf") {
      const cfMap = await getCFRecommendations(topN);
      for (const userId of users) {
        userRecs.set(userId, cfMap.get(userId) || []);
      }
    }

    if (algorithm === "hybrid") {
      const hybrid = await getHybridRecommendations(topN);
      for (const userId of users) {
        userRecs.set(userId, hybrid.get(userId) || []);
      }
    }

    await insertRecommendations(batchId, userRecs);

    return res.json({ ok: true, batch_id: batchId });
  } catch (err) {
    await pool.query(
      "INSERT INTO recommendation_batches (algorithm, status) VALUES (?, 'failed')",
      [req.body.algorithm || "unknown"]
    );
    return next(err);
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { algorithm } = req.query;
    let batchQuery = "SELECT * FROM recommendation_batches WHERE status = 'success'";
    const params = [];
    if (algorithm && ["cf", "content", "hot", "hybrid"].includes(algorithm)) {
      batchQuery += " AND algorithm = ?";
      params.push(algorithm);
    }
    batchQuery += " ORDER BY generated_at DESC LIMIT 1";
    const [[batch]] = await pool.query(batchQuery, params);
    if (!batch) {
      return res.json({ batch: null, items: [] });
    }

    const [items] = await pool.query(
      "SELECT r.rank, r.score, r.reason, m.movie_id, m.title, m.poster_url FROM recommendations r JOIN movies m ON r.movie_id = m.movie_id WHERE r.user_id = ? AND r.batch_id = ? ORDER BY r.rank ASC",
      [userId, batch.batch_id]
    );

    return res.json({ batch, items });
  } catch (err) {
    return next(err);
  }
}

export async function listBatches(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM recommendation_batches ORDER BY generated_at DESC LIMIT 20"
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}
