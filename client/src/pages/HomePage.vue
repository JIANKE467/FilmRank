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
          <p class="muted">结合新鲜度与相似喜好，为你挑选。</p>
          <RouterLink class="button secondary" to="/recommendations">查看推荐</RouterLink>
        </div>
        <div class="hero-card highlight">
          <p class="eyebrow">热映</p>
          <h3>当前热门</h3>
          <p class="muted">FilmRank 社区里最受关注的影片。</p>
        </div>
      </div>
    </div>

    <div v-if="message" class="muted">{{ message }}</div>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">精选推荐</h2>
        <RouterLink class="link" to="/recommendations">查看全部</RouterLink>
      </div>
      <div class="grid" v-if="featured.length">
        <article class="movie-card" v-for="item in featured" :key="item.movie_id">
          <PosterImage :src="item.poster_url" :alt="item.title" />
          <div class="card-body">
            <div>
              <h3>{{ item.title }}</h3>
              <p class="muted">{{ item.reason || "为你精选" }}</p>
            </div>
            <RouterLink class="button secondary" :to="`/movies/${item.movie_id}`">详情</RouterLink>
          </div>
        </article>
      </div>
      <p class="muted" v-else>暂无推荐。</p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">热门影片</h2>
        <RouterLink class="link" to="/search">浏览全部</RouterLink>
      </div>
      <div class="grid" v-if="hot.length">
        <article class="movie-card" v-for="movie in hot" :key="movie.movie_id">
          <PosterImage :src="movie.poster_url" :alt="movie.title" />
          <div class="card-body">
            <div>
              <h3>{{ movie.title }}</h3>
              <p class="muted">{{ movie.year || "-" }} / {{ movie.language || "-" }}</p>
            </div>
            <RouterLink class="button secondary" :to="`/movies/${movie.movie_id}`">详情</RouterLink>
          </div>
        </article>
      </div>
      <p class="muted" v-else>暂无影片。</p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">最新上映</h2>
        <RouterLink class="link" to="/search">查看更多</RouterLink>
      </div>
      <div class="grid" v-if="latest.length">
        <article class="movie-card" v-for="movie in latest" :key="movie.movie_id">
          <PosterImage :src="movie.poster_url" :alt="movie.title" />
          <div class="card-body">
            <div>
              <h3>{{ movie.title }}</h3>
              <p class="muted">{{ movie.year || "-" }} / {{ movie.language || "-" }}</p>
            </div>
            <RouterLink class="button secondary" :to="`/movies/${movie.movie_id}`">详情</RouterLink>
          </div>
        </article>
      </div>
      <p class="muted" v-else>暂无影片。</p>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { api } from "../api.js";
import useAuth from "../store/auth.js";
import PosterImage from "../components/PosterImage.vue";

const router = useRouter();
const { isAuthed } = useAuth();

const query = ref("");
const featured = ref([]);
const hot = ref([]);
const latest = ref([]);
const genres = ref([]);
const message = ref("");

function goSearch() {
  router.push({ path: "/search", query: query.value ? { q: query.value } : {} });
}

function goGenre(id) {
  router.push({ path: "/search", query: { genre: id } });
}

async function load() {
  message.value = "";
  try {
    const [movies, latestMovies, genreList] = await Promise.all([
      api.listMovies({ sort: "hot" }),
      api.listMovies({ sort: "latest" }),
      api.listGenres()
    ]);
    hot.value = (movies || []).slice(0, 6);
    latest.value = (latestMovies || []).slice(0, 6);
    genres.value = (genreList || []).slice(0, 8);

    if (isAuthed.value) {
      const data = await api.listRecommendations();
      featured.value = (data.items || []).slice(0, 6);
    } else {
      featured.value = (movies || []).slice(0, 6).map((movie) => ({
        ...movie,
        reason: "登录以获取专属推荐"
      }));
    }
  } catch (err) {
    message.value = err.message;
  }
}

onMounted(load);
</script>

