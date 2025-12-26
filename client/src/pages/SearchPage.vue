<template>
  <section class="page">
    <div class="page-hero">
      <div>
        <p class="eyebrow">电影搜索</p>
        <h1>找到与你心情匹配的电影</h1>
        <p class="muted">按片名、年份、类型或语言搜索，并通过筛选精确定位。</p>
      </div>
      <div class="search-panel">
        <div class="search-box">
          <input
            v-model="filters.q"
            class="input"
            placeholder="按片名、导演、演员或角色搜索"
            @focus="showSuggestions = true"
            @blur="hideSuggestions"
          />
          <div
            v-if="showSuggestions && (history.length || suggestions.length || genres.length)"
            class="suggestion-panel"
          >
            <div v-if="history.length" class="suggestion-group">
              <p class="label">最近搜索</p>
              <div class="suggestion-row">
                <button
                  v-for="item in history"
                  :key="item"
                  class="suggestion-chip"
                  @mousedown.prevent="applySearch(item)"
                >
                  {{ item }}
                </button>
              </div>
            </div>
            <div v-if="suggestions.length" class="suggestion-group">
              <p class="label">片名匹配</p>
              <div class="suggestion-list">
                <button
                  v-for="item in suggestions"
                  :key="item.movie_id"
                  class="suggestion-item"
                  @mousedown.prevent="applySearch(item.title)"
                >
                  <span>{{ item.title }}</span>
                  <span class="muted">{{ item.year || "-" }}</span>
                </button>
              </div>
            </div>
            <div v-if="genres.length" class="suggestion-group">
              <p class="label">热门类型</p>
              <div class="suggestion-row">
                <button
                  v-for="genre in genres.slice(0, 8)"
                  :key="genre.genre_id"
                  class="suggestion-chip"
                  @mousedown.prevent="applyGenre(genre)"
                >
                  {{ genre.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <button class="button" @click="load">搜索</button>
        <button class="button ghost" @click="toggleFilters">
          {{ filtersOpen ? "收起筛选" : "高级筛选" }}
        </button>
      </div>
    </div>

    <div v-if="filtersOpen" class="filter-card">
      <div class="filter-grid">
        <div>
          <label class="label">年份</label>
          <input v-model="filters.year" class="input" placeholder="2024" />
        </div>
        <div>
          <label class="label">类型</label>
          <select v-model="filters.genreId" class="input">
            <option value="">全部</option>
            <option v-for="genre in genres" :key="genre.genre_id" :value="String(genre.genre_id)">
              {{ genre.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">语言</label>
          <input v-model="filters.language" class="input" placeholder="en / zh" />
        </div>
        <div>
          <label class="label">地区</label>
          <input v-model="filters.country" class="input" placeholder="US / CN" />
        </div>
        <div>
          <label class="label">时长（分钟）</label>
          <input v-model="filters.minRuntime" class="input" placeholder="80" />
        </div>
        <div>
          <label class="label">时长（最大）</label>
          <input v-model="filters.maxRuntime" class="input" placeholder="180" />
        </div>
        <div>
          <label class="label">排序</label>
          <select v-model="filters.sort" class="input">
            <option value="latest">最新</option>
          </select>
        </div>
        <div class="filter-actions">
          <button class="button" @click="load">应用</button>
          <button class="button secondary" @click="reset">清空筛选</button>
        </div>
      </div>
    </div>

    <div class="sort-bar">
      <span class="label">排序</span>
      <button class="button" :class="{ secondary: filters.sort !== 'latest' }" @click="setSort('latest')">
        最新
      </button>
    </div>

    <div class="result-bar" v-if="!isLoading">
      <span class="muted">共 {{ movies.length }} 部</span>
      <span class="muted" v-if="filters.q">关键词：{{ filters.q }}</span>
    </div>

    <p class="muted" v-if="message">{{ message }}</p>

    <div class="grid" v-if="movies.length">
      <article class="movie-card" v-for="movie in movies" :key="movie.movie_id">
        <PosterImage :src="movie.poster_url" :alt="movie.title" />
        <div class="card-body">
          <div>
            <h3>{{ movie.title }}</h3>
            <p class="muted">{{ movie.year || "-" }} / {{ movie.language || "-" }}</p>
          </div>
          <RouterLink class="button secondary" :to="`/movies/${movie.movie_id}`">查看详情</RouterLink>
        </div>
      </article>
    </div>
    <p class="muted" v-else-if="!isLoading">没有找到影片，请换个关键词试试。</p>
    <div class="load-more" v-if="hasMore && !isLoading">
      <button class="button secondary" @click="loadMore">加载更多</button>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { api } from "../api.js";
import PosterImage from "../components/PosterImage.vue";

const route = useRoute();
const movies = ref([]);
const genres = ref([]);
const message = ref("");
const isLoading = ref(true);
const filtersOpen = ref(false);
const showSuggestions = ref(false);
const suggestions = ref([]);
const history = ref([]);
const page = ref(1);
const hasMore = ref(false);
const pageSize = 18;
const historyKey = "filmrank.search.history";
let suggestTimer;
const filters = reactive({
  q: "",
  year: "",
  genreId: "",
  language: "",
  country: "",
  minRuntime: "",
  maxRuntime: "",
  sort: "latest"
});

function toggleFilters() {
  filtersOpen.value = !filtersOpen.value;
}

function reset() {
  filters.q = "";
  filters.year = "";
  filters.genreId = "";
  filters.language = "";
  filters.country = "";
  filters.minRuntime = "";
  filters.maxRuntime = "";
  filters.sort = "latest";
  load();
}

function setSort(value) {
  filters.sort = value;
  load();
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(historyKey);
    history.value = raw ? JSON.parse(raw) : [];
  } catch {
    history.value = [];
  }
}

function saveHistory(term) {
  const clean = term.trim();
  if (!clean) return;
  const next = [clean, ...history.value.filter((item) => item !== clean)].slice(0, 6);
  history.value = next;
  localStorage.setItem(historyKey, JSON.stringify(next));
}

function hideSuggestions() {
  window.setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
}

function applySearch(value) {
  filters.q = value;
  showSuggestions.value = false;
  load();
}

function applyGenre(genre) {
  filters.genreId = String(genre.genre_id);
  showSuggestions.value = false;
  load();
}

async function fetchSuggestions(value) {
  if (!value || value.trim().length < 2) {
    suggestions.value = [];
    return;
  }
  try {
    suggestions.value = await api.listMovies({ q: value.trim(), limit: 6 });
  } catch {
    suggestions.value = [];
  }
}

async function load(options = {}) {
  const { append = false } = options;
  message.value = "";
  isLoading.value = true;
  try {
    const params = {};
    if (filters.q) params.q = filters.q;
    if (filters.year) params.year = filters.year;
    if (filters.genreId) params.genre_id = filters.genreId;
    if (filters.language) params.language = filters.language;
    if (filters.country) params.country = filters.country;
    if (filters.minRuntime) params.min_runtime = filters.minRuntime;
    if (filters.maxRuntime) params.max_runtime = filters.maxRuntime;
    if (filters.sort) params.sort = filters.sort;
    params.page_size = pageSize;
    params.page = append ? page.value + 1 : 1;
    const result = await api.listMovies(params);
    if (append) {
      movies.value = [...movies.value, ...result];
      page.value += 1;
    } else {
      movies.value = result;
      page.value = 1;
    }
    hasMore.value = result.length === pageSize;
    saveHistory(filters.q);
  } catch (err) {
    message.value = err.message;
  } finally {
    isLoading.value = false;
  }
}

function loadMore() {
  if (hasMore.value && !isLoading.value) {
    load({ append: true });
  }
}

async function loadGenres() {
  try {
    genres.value = await api.listGenres();
  } catch (err) {
    message.value = err.message;
  }
}

onMounted(() => {
  if (route.query.q) {
    filters.q = String(route.query.q);
  }
  if (route.query.genre) {
    filters.genreId = String(route.query.genre);
  }
  loadHistory();
  loadGenres();
  load();
});

watch(
  () => route.query,
  (next) => {
    if (next.q !== undefined) {
      filters.q = String(next.q || "");
    }
    if (next.genre !== undefined) {
      filters.genreId = String(next.genre || "");
    }
    load();
  }
);

watch(
  () => filters.q,
  (value) => {
    clearTimeout(suggestTimer);
    suggestTimer = window.setTimeout(() => fetchSuggestions(value), 300);
  }
);
</script>

