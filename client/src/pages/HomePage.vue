<template>
  <section class="page">
    <div class="hero">
      <div class="hero-copy">
        <p class="eyebrow">FilmRank 首页</p>
        <h1>精选电影，为你的下一次观影量身定制。</h1>
        <p class="muted">按片名、类型或语言搜索，发现热门与个性化片单。</p>
        <div class="hero-search">
          <input v-model="query" class="input" placeholder="搜索电影、演员或类型" />
          <button class="button" @click="goSearch">搜索</button>
        </div>
        <div class="chip-row">
          <button
            v-for="genre in genres"
            :key="genre.genre_id"
            class="chip"
            @click="goGenre(genre.genre_id)"
          >
            {{ genre.name }}
          </button>
        </div>
      </div>
      <div class="hero-panel">
        <div class="hero-card">
          <p class="eyebrow">今日</p>
          <h3>专属片单</h3>
          <p class="muted">每次进入都会随机挑选一部值得观看的电影。</p>
          <div v-if="dailyPick" class="hero-mini">
            <PosterImage :src="dailyPick.poster_url" :alt="dailyPick.title" size="tiny" />
            <div class="hero-mini-info">
              <h4>{{ dailyPick.title }}</h4>
              <p class="muted">
                {{ dailyPick.year || "-" }} / {{ formatLanguage(dailyPick.language) }}
                <span v-if="dailyPick.tmdb_vote_average"> · 评分 {{ dailyPick.tmdb_vote_average }}</span>
              </p>
            </div>
          </div>
          <p v-else class="muted">暂无推荐，请稍后再试。</p>
        </div>
        <div class="hero-card highlight">
          <p class="eyebrow">热映</p>
          <h3>当前热门</h3>
          <p class="muted">自动轮播展示本周最受关注的影片。</p>
          <div v-if="hotSpotlights.length" class="hero-mini">
            <PosterImage
              :src="hotSpotlights[hotSpotlightIndex]?.poster_url"
              :alt="hotSpotlights[hotSpotlightIndex]?.title"
              size="tiny"
            />
            <div class="hero-mini-info">
              <h4>{{ hotSpotlights[hotSpotlightIndex]?.title }}</h4>
              <p class="muted">
                {{ hotSpotlights[hotSpotlightIndex]?.year || "-" }} /
                {{ formatLanguage(hotSpotlights[hotSpotlightIndex]?.language) }}
              </p>
            </div>
          </div>
          <p v-else class="muted">暂无热映数据。</p>
        </div>
      </div>
    </div>

    <div v-if="message" class="muted" role="status" aria-live="polite">{{ message }}</div>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">本周热映</h2>
        <RouterLink class="link" to="/search">浏览全部</RouterLink>
      </div>
      <div class="grid" v-if="hot.length">
        <article class="movie-card" v-for="movie in hot" :key="movie.movie_id">
          <PosterImage :src="movie.poster_url" :alt="movie.title" />
          <div class="card-body">
            <div>
              <h3>{{ movie.title }}</h3>
              <p class="muted">{{ movie.year || "-" }} / {{ formatLanguage(movie.language) }}</p>
            </div>
            <RouterLink class="button secondary" :to="`/movies/${movie.movie_id}`">详情</RouterLink>
          </div>
        </article>
      </div>
      <div class="pager-numbers" v-if="hotPages.length">
        <button class="page-nav" :disabled="hotPage === 1" @click="setHotPage(hotPage - 1)">
          上一页
        </button>
        <button
          v-for="page in hotPages"
          :key="page"
          class="page-number"
          :class="{ active: hotPage === page }"
          @click="setHotPage(page)"
        >
          {{ page }}
        </button>
        <button class="page-nav" @click="setHotPage(hotPage + 1)">下一页</button>
      </div>
      <p class="muted" v-else>暂无影片。</p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">电视播出</h2>
        <RouterLink class="link" to="/search">浏览全部</RouterLink>
      </div>
      <div class="grid" v-if="tvShows.length">
        <article class="movie-card" v-for="show in tvShows" :key="show.tmdb_id">
          <PosterImage :src="show.poster_url" :alt="show.title" />
          <div class="card-body">
            <div>
              <h3>{{ show.title }}</h3>
              <p class="muted">{{ show.year || "-" }} / {{ formatLanguage(show.language) }}</p>
            </div>
            <RouterLink class="button secondary" :to="`/tv/${show.tmdb_id}`">详情</RouterLink>
          </div>
        </article>
      </div>
      <div class="pager-numbers" v-if="tvPages.length">
        <button class="page-nav" :disabled="tvPage === 1" @click="setTvPage(tvPage - 1)">
          上一页
        </button>
        <button
          v-for="page in tvPages"
          :key="page"
          class="page-number"
          :class="{ active: tvPage === page }"
          @click="setTvPage(page)"
        >
          {{ page }}
        </button>
        <button class="page-nav" @click="setTvPage(tvPage + 1)">下一页</button>
      </div>
      <p class="muted" v-else>暂无节目。</p>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { api } from "../api.js";
import PosterImage from "../components/PosterImage.vue";

const router = useRouter();

const query = ref("");
const hot = ref([]);
const tvShows = ref([]);
const genres = ref([]);
const message = ref("");
const dailyPick = ref(null);
const hotSpotlights = ref([]);
const hotSpotlightIndex = ref(0);
const pageSize = 6;
const hotPage = ref(1);
const tvPage = ref(1);
const hotPages = computed(() => buildPageWindow(hotPage.value, true));
const tvPages = computed(() => buildPageWindow(tvPage.value, true));
let spotlightTimer;

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

function goSearch() {
  router.push({ path: "/search", query: query.value ? { q: query.value } : {} });
}

function goGenre(id) {
  router.push({ path: "/search", query: { genre: id } });
}

function formatLanguage(code) {
  if (!code) return "--";
  const clean = String(code).toLowerCase();
  return languageLabels[clean] || code;
}

function buildPageWindow(current, canAdvance, size = 5) {
  const safeCurrent = Number.isFinite(Number(current)) ? Number(current) : 1;
  const maxPage = canAdvance ? safeCurrent + 2 : safeCurrent;
  const end = Math.max(safeCurrent, maxPage);
  const start = Math.max(1, end - size + 1);
  const pages = [];
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }
  return pages;
}

async function load() {
  message.value = "";
  await Promise.all([loadHot(), loadTv(), loadGenres()]);
}

function setHotPage(page) {
  if (hotPage.value !== page) {
    hotPage.value = page;
    loadHot();
  }
}

function setTvPage(page) {
  if (tvPage.value !== page) {
    tvPage.value = page;
    loadTv();
  }
}

async function loadGenres() {
  try {
    const genreList = await api.listGenres();
    genres.value = Array.isArray(genreList) ? genreList.slice(0, 8) : [];
  } catch (err) {
    message.value = err.message;
  }
}

async function loadHot() {
  try {
    const hotTmdb = await api.listTmdbCategory("trending_week", {
      limit: pageSize,
      page: hotPage.value
    });
    const safeHot = Array.isArray(hotTmdb) ? hotTmdb : [];
    if (!Array.isArray(hotTmdb)) {
      message.value = "热映数据加载异常，请稍后重试。";
    }
    hot.value = safeHot.slice(0, 6);
    const hotCandidates = safeHot.slice(0, 10);
    if (hotCandidates.length) {
      dailyPick.value = hotCandidates[Math.floor(Math.random() * hotCandidates.length)];
      hotSpotlights.value = hotCandidates.slice(0, 6);
      hotSpotlightIndex.value = 0;
      startSpotlightRotation();
    } else {
      dailyPick.value = null;
      hotSpotlights.value = [];
      stopSpotlightRotation();
    }
  } catch (err) {
    message.value = err.message;
    hot.value = [];
    dailyPick.value = null;
    hotSpotlights.value = [];
    stopSpotlightRotation();
  }
}

async function loadTv() {
  try {
    const tvTmdb = await api.listTmdbTvCategory("on_the_air", {
      limit: pageSize,
      page: tvPage.value
    });
    const safeTv = Array.isArray(tvTmdb) ? tvTmdb : [];
    if (!Array.isArray(tvTmdb)) {
      message.value = "电视播出数据加载异常，请稍后重试。";
    }
    tvShows.value = safeTv.slice(0, 6);
  } catch (err) {
    message.value = err.message;
    tvShows.value = [];
  }
}

function startSpotlightRotation() {
  stopSpotlightRotation();
  if (hotSpotlights.value.length > 1) {
    spotlightTimer = setInterval(() => {
      hotSpotlightIndex.value =
        (hotSpotlightIndex.value + 1) % hotSpotlights.value.length;
    }, 3500);
  }
}

function stopSpotlightRotation() {
  if (spotlightTimer) {
    clearInterval(spotlightTimer);
    spotlightTimer = null;
  }
}

onMounted(load);
onBeforeUnmount(() => {
  stopSpotlightRotation();
});
</script>

