<template>
  <section v-if="movie" class="page">
    <div class="detail-hero">
      <PosterImage :src="movie.poster_url" :alt="movie.title" size="large" />
      <div class="detail-info">
        <p class="eyebrow">电影详情</p>
        <h1>{{ movie.title }}</h1>
        <p class="muted">{{ movie.description || "此电影暂无详细介绍，正在补充中。" }}</p>

        <div class="tag-row">
          <span class="tag" v-for="genre in genres" :key="genre.genre_id">{{ genre.name }}</span>
        </div>

        <div class="detail-meta">
          <div>
            <p class="label">原名</p>
            <p>{{ movie.original_title || "--" }}</p>
          </div>
          <div>
            <p class="label">上映时间</p>
            <p>{{ formatReleaseDate(movie.release_date) }}</p>
          </div>
          <div>
            <p class="label">片长</p>
            <p>{{ movie.runtime_minutes ? `${movie.runtime_minutes} 分钟` : "未定" }}</p>
          </div>
          <div>
            <p class="label">语言</p>
            <p>{{ formatLanguage(movie.language) }}</p>
          </div>
          <div>
            <p class="label">票房</p>
            <p>{{ formatRevenue(movie.tmdb_revenue) }}</p>
          </div>
        </div>

        <div class="rating-strip">
          <div>
            <p class="label">平均评分</p>
            <p class="score">{{ avgScoreText }}</p>
          </div>
          <div>
            <p class="label">评分人数</p>
            <p class="score">{{ ratingCountText }}</p>
          </div>
          <div>
            <p class="label">评论数</p>
            <p class="score">{{ reviewCountText }}</p>
          </div>
          <div>
            <p class="label">TMDB 评分</p>
            <p class="score">{{ tmdbRatingText }}</p>
          </div>
          <button class="button secondary" :disabled="!isAuthed || bookmarkId" @click="saveFavorite">
            {{ bookmarkId ? "已收藏" : "收藏" }}
          </button>
        </div>
        <div class="action-row">
          <button class="button ghost" :disabled="!isAuthed || !bookmarkId" @click="clearBookmark">
            清除收藏
          </button>
          <span class="muted" v-if="!isAuthed">登录后可收藏影片</span>
        </div>
      </div>
    </div>

    <section class="section" v-if="keywords.length">
      <div class="section-head">
        <h2 class="section-title">关键词</h2>
      </div>
      <div class="tag-row">
        <span class="tag" v-for="keyword in keywords" :key="keyword.keyword_id">
          {{ keyword.name }}
        </span>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">演员表</h2>
      </div>
      <div v-if="cast.length" class="cast-grid">
        <div class="cast-card" v-for="member in cast" :key="member.cast_id">
          <img
            v-if="member.profile_url"
            class="cast-avatar"
            :src="member.profile_url"
            :alt="member.name"
            loading="lazy"
          />
          <div v-else class="cast-avatar placeholder"></div>
          <div>
            <p class="list-title">{{ member.name }}</p>
            <p class="muted">{{ member.character_name || "演员" }}</p>
          </div>
        </div>
      </div>
      <p v-else class="muted">暂无演员信息。</p>
    </section>

    <div class="split">
      <div class="card">
        <h3>私人书签</h3>
        <p class="muted">给自己做个标注，方便以后回看。</p>
        <textarea v-model="bookmarkNote" class="input" rows="4" placeholder="写下你的标注..."></textarea>
        <div class="bookmark-actions">
          <button class="button" :disabled="!isAuthed" @click="saveNote">书签标记</button>
          <button class="button secondary" :disabled="!isAuthed || !bookmarkId" @click="clearBookmark">
            删除书签
          </button>
        </div>
        <p class="muted" v-if="bookmarkMessage">{{ bookmarkMessage }}</p>
      </div>

      <div class="card" v-if="!isTmdb">
        <h3>写评论</h3>
        <textarea v-model="review" class="input" rows="4" placeholder="分享你的看法..."></textarea>
        <button class="button" style="margin-top: 8px;" :disabled="!isAuthed" @click="submitReview">发布</button>
        <p class="muted" v-if="reviewMessage">{{ reviewMessage }}</p>
      </div>
      <div class="card" v-else>
        <h3>TMDB 评论</h3>
        <p class="muted">评论来自 TMDB，当前不可编辑。</p>
      </div>
    </div>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">最新评论</h2>
        <span class="muted">{{ reviews.length }} 条</span>
      </div>
      <div v-if="reviews.length" class="stack">
        <div class="card review-card" v-for="item in reviews" :key="item.review_id">
          <div class="review-head">
            <strong>{{ item.username }}</strong>
            <span class="muted">
              {{ formatDate(item.created_at) }}
            </span>
          </div>
          <p v-if="editingReviewId !== item.review_id">{{ item.content }}</p>
          <div v-else>
            <textarea v-model="editingContent" class="input" rows="3"></textarea>
          </div>
          <div class="review-actions" v-if="isOwnReview(item)">
            <button
              v-if="editingReviewId !== item.review_id"
              class="button ghost"
              @click="startEdit(item)"
            >
              编辑
            </button>
            <button
              v-if="editingReviewId === item.review_id"
              class="button"
              @click="saveEdit(item)"
            >
              保存
            </button>
            <button
              v-if="editingReviewId === item.review_id"
              class="button secondary"
              @click="cancelEdit"
            >
              取消
            </button>
            <button class="button secondary" @click="removeReview(item)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="muted">暂无评论，快来抢沙发。</p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">相关推荐</h2>
      </div>
      <div class="grid" v-if="related.length">
        <article class="movie-card" v-for="item in related" :key="item.movie_id">
          <PosterImage :src="item.poster_url" :alt="item.title" />
          <div class="card-body">
            <div>
              <h3>{{ item.title }}</h3>
              <p class="muted">{{ item.year || "-" }} / {{ formatLanguage(item.language) }}</p>
            </div>
            <RouterLink class="button secondary" :to="`/movies/${item.movie_id}`">详情</RouterLink>
          </div>
        </article>
      </div>
      <p v-else class="muted">暂无相关影片。</p>
    </section>
  </section>
  <section v-else class="page">
    <div class="card" v-if="errorMessage">
      <h3>无法加载影片</h3>
      <p class="muted">{{ errorMessage }}</p>
      <button class="button secondary" @click="load({ force: true })">重试</button>
    </div>
    <p v-else class="muted">加载中...</p>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { api } from "../api.js";
import useAuth from "../store/auth.js";
import PosterImage from "../components/PosterImage.vue";

const route = useRoute();
const { state, isAuthed } = useAuth();

const movie = ref(null);
const genres = ref([]);
const rating = ref({});
const reviews = ref([]);
const related = ref([]);
const reviewCount = ref(0);
const errorMessage = ref("");
const review = ref("");
const bookmarkMessage = ref("");
const reviewMessage = ref("");
const editingReviewId = ref(null);
const editingContent = ref("");
const cacheKeyPrefix = "filmrank.movie.";
const cacheTtlMs = 5 * 60 * 1000;
const avgScoreText = ref("--");
const ratingCountText = ref("--");
const reviewCountText = ref("--");
const tmdbRatingText = ref("--");
const keywords = ref([]);
const cast = ref([]);

const languageLabels = {
  zh: "中文",
  en: "英语",
  ja: "日语",
  ko: "韩语",
  fr: "法语",
  de: "德语",
  es: "西班牙语",
  it: "意大利语",
  ru: "俄语",
  pt: "葡萄牙语",
  hi: "印地语",
  th: "泰语",
  id: "印尼语",
  ms: "马来语",
  ar: "阿拉伯语",
  tr: "土耳其语",
  nl: "荷兰语",
  sv: "瑞典语",
  no: "挪威语",
  da: "丹麦语",
  fi: "芬兰语"
};
const bookmarkNote = ref("");
const bookmarkId = ref(null);
const bookmarkType = ref(null);
const isTmdb = ref(false);

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleString();
}

function formatReleaseDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split("T")[0];
  return date.toISOString().slice(0, 10);
}

function formatRevenue(value) {
  if (!value || Number(value) <= 0) return "未披露";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatLanguage(code) {
  if (!code) return "--";
  const clean = String(code).toLowerCase();
  return languageLabels[clean] || code;
}

function isOwnReview(item) {
  return state.user && item.username === state.user.username;
}

function startEdit(item) {
  editingReviewId.value = item.review_id;
  editingContent.value = item.content;
}

function cancelEdit() {
  editingReviewId.value = null;
  editingContent.value = "";
}

async function saveEdit(item) {
  try {
    await api.updateReview(item.review_id, { content: editingContent.value });
    cancelEdit();
    await load();
  } catch (err) {
    reviewMessage.value = err.message;
  }
}

async function removeReview(item) {
  reviewMessage.value = "";
  try {
    await api.deleteReview(item.review_id);
    await load();
  } catch (err) {
    reviewMessage.value = err.message;
  }
}

async function loadBookmark(movieId) {
  if (!isAuthed.value) {
    bookmarkNote.value = "";
    bookmarkId.value = null;
    return;
  }
  try {
    const data = await api.getBookmark(movieId);
    if (data) {
      bookmarkId.value = data.bookmark_id;
      bookmarkNote.value = data.note || "";
      bookmarkType.value = data.kind || (data.note ? "note" : "favorite");
    } else {
      bookmarkId.value = null;
      bookmarkNote.value = "";
      bookmarkType.value = null;
    }
  } catch {
    bookmarkId.value = null;
    bookmarkNote.value = "";
    bookmarkType.value = null;
  }
}

function getCachedMovie(id) {
  try {
    const raw = sessionStorage.getItem(`${cacheKeyPrefix}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > cacheTtlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedMovie(id, data) {
  try {
    sessionStorage.setItem(
      `${cacheKeyPrefix}${id}`,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch {
    // Ignore storage errors.
  }
}

async function load(options = {}) {
  const { force = false } = options;
  const movieId = route.params.id;
  errorMessage.value = "";
  if (!movieId) {
    movie.value = null;
    errorMessage.value = "无效的影片 ID。";
    return;
  }
  if (!force) {
    const cached = getCachedMovie(movieId);
    if (cached) {
      movie.value = cached.movie;
      isTmdb.value = movie.value?.source === "tmdb";
      rating.value = cached.rating || {};
      genres.value = cached.genres || [];
      reviewCount.value = cached.review_count || 0;
      reviews.value = cached.reviews || [];
      related.value = cached.related || [];
      keywords.value = cached.keywords || [];
      cast.value = cached.cast || [];
      const tmdbAvg = Number(cached.movie?.tmdb_vote_average);
      const tmdbCount = Number(cached.movie?.tmdb_vote_count || 0);
      avgScoreText.value = tmdbCount > 0 && Number.isFinite(tmdbAvg) ? tmdbAvg.toFixed(1) : "暂无评分";
      ratingCountText.value = tmdbCount > 0 ? String(tmdbCount) : "暂无";
      reviewCountText.value = reviewCount.value > 0 ? String(reviewCount.value) : "暂无";
      tmdbRatingText.value =
        tmdbCount > 0 && Number.isFinite(tmdbAvg) ? `${tmdbAvg.toFixed(1)} (${tmdbCount})` : "暂无";
      await loadBookmark(movieId);
      return;
    }
  }
  try {
    const data = await api.getMovie(movieId);
    movie.value = data.movie;
    isTmdb.value = movie.value?.source === "tmdb";
    rating.value = data.rating || {};
    genres.value = data.genres || [];
    reviewCount.value = data.review_count || 0;
    reviews.value = data.reviews || [];
    related.value = data.related || [];
    keywords.value = data.keywords || [];
    cast.value = data.cast || [];
    setCachedMovie(movieId, data);
    const tmdbAvg = Number(movie.value?.tmdb_vote_average);
    const tmdbCount = Number(movie.value?.tmdb_vote_count || 0);
    avgScoreText.value = tmdbCount > 0 && Number.isFinite(tmdbAvg) ? tmdbAvg.toFixed(1) : "暂无评分";
    ratingCountText.value = tmdbCount > 0 ? String(tmdbCount) : "暂无";
    reviewCountText.value = reviewCount.value > 0 ? String(reviewCount.value) : "暂无";
    tmdbRatingText.value =
      tmdbCount > 0 && Number.isFinite(tmdbAvg) ? `${tmdbAvg.toFixed(1)} (${tmdbCount})` : "暂无";
    await loadBookmark(movieId);
  } catch (err) {
    movie.value = null;
    errorMessage.value = err.message || "加载影片详情失败。";
  }
}

async function saveFavorite() {
  bookmarkMessage.value = "";
  try {
    await api.saveBookmark({ movie_id: movie.value.movie_id, type: "favorite" });
    bookmarkMessage.value = "已收藏";
    await loadBookmark(movie.value.movie_id);
  } catch (err) {
    bookmarkMessage.value = err.message;
  }
}

async function saveNote() {
  bookmarkMessage.value = "";
  try {
    await api.saveBookmark({
      movie_id: movie.value.movie_id,
      type: "note",
      note: bookmarkNote.value
    });
    bookmarkMessage.value = "书签已保存";
    await loadBookmark(movie.value.movie_id);
  } catch (err) {
    bookmarkMessage.value = err.message;
  }
}

async function clearBookmark() {
  bookmarkMessage.value = "";
  try {
    await api.deleteBookmark(movie.value.movie_id);
    bookmarkMessage.value = "书签已清除";
    bookmarkNote.value = "";
    bookmarkId.value = null;
  } catch (err) {
    bookmarkMessage.value = err.message;
  }
}

async function submitReview() {
  reviewMessage.value = "";
  try {
    await api.createReview({ movie_id: movie.value.movie_id, content: review.value });
    reviewMessage.value = "评论已发布";
    review.value = "";
    await load({ force: true });
  } catch (err) {
    reviewMessage.value = err.message;
  }
}

onMounted(load);
watch(() => route.params.id, () => {
  load({ force: true });
});
</script>

