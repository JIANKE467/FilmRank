import { buildTmdbBackdropUrl, buildTmdbPosterUrl, listTmdbTvCategory } from "../services/tmdb.js";

export async function listTvShows(req, res, next) {
  try {
    const { category = "on_the_air", page, limit, language } = req.query;
    const tmdbLanguage = language || process.env.TMDB_LANGUAGE || "zh-CN";
    const tmdbPage = Number(page || 1);
    const shows = await listTmdbTvCategory(String(category), tmdbLanguage, tmdbPage);
    const normalized = (shows || []).map((show) => {
      const airDate = show.first_air_date || null;
      const year = airDate ? Number(airDate.slice(0, 4)) : null;
      return {
        tmdb_id: show.id,
        title: show.name || show.original_name || "Unknown",
        original_title: show.original_name || null,
        release_date: airDate,
        year: Number.isFinite(year) ? year : null,
        language: show.original_language || null,
        description: show.overview || null,
        poster_url: buildTmdbPosterUrl(show.poster_path),
        backdrop_url: buildTmdbBackdropUrl(show.backdrop_path),
        source: "tmdb_tv"
      };
    });
    const rawLimit = Number(limit);
    const pageSize = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : normalized.length;
    return res.json(normalized.slice(0, pageSize));
  } catch (err) {
    return next(err);
  }
}
