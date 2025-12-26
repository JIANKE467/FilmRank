import {
  buildTmdbBackdropUrl,
  buildTmdbPosterUrl,
  listTmdbTvCategory,
  getTmdbTvDetails,
  getTmdbTvCredits,
  buildTmdbProfileUrl
} from "../services/tmdb.js";

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

export async function getTvShow(req, res, next) {
  try {
    const tvId = Number(req.params.id);
    if (!Number.isFinite(tvId)) {
      const err = new Error("invalid tv id");
      err.status = 400;
      throw err;
    }
    const tmdbLanguage = req.query.language || process.env.TMDB_LANGUAGE || "zh-CN";
    const details = await getTmdbTvDetails(tvId, tmdbLanguage);
    const credits = await getTmdbTvCredits(tvId, tmdbLanguage);
    const cast = Array.isArray(credits?.cast)
      ? credits.cast.slice(0, 10).map((member) => ({
          cast_id: member.id,
          name: member.name,
          character_name: member.character,
          profile_url: buildTmdbProfileUrl(member.profile_path)
        }))
      : [];
    const firstAir = details?.first_air_date || null;
    const year = firstAir ? Number(firstAir.slice(0, 4)) : null;
    res.json({
      tmdb_id: details.id,
      title: details.name || details.original_name || "Unknown",
      original_title: details.original_name || null,
      release_date: firstAir,
      year: Number.isFinite(year) ? year : null,
      language: details.original_language || null,
      description: details.overview || null,
      poster_url: buildTmdbPosterUrl(details.poster_path),
      backdrop_url: buildTmdbBackdropUrl(details.backdrop_path),
      rating: Number.isFinite(Number(details.vote_average)) ? Number(details.vote_average) : null,
      rating_count: Number.isFinite(Number(details.vote_count)) ? Number(details.vote_count) : 0,
      seasons: Number.isFinite(Number(details.number_of_seasons)) ? Number(details.number_of_seasons) : null,
      episodes: Number.isFinite(Number(details.number_of_episodes)) ? Number(details.number_of_episodes) : null,
      genres: Array.isArray(details.genres) ? details.genres : [],
      cast
    });
  } catch (err) {
    return next(err);
  }
}
