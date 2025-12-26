<template>
  <section class="page" v-if="show">
    <div class="detail-hero">
      <PosterImage :src="show.poster_url" :alt="show.title" size="large" />
      <div class="detail-info">
        <h1>{{ show.title }}</h1>
        <p class="muted">{{ show.year || "-" }} / {{ show.language || "-" }}</p>
        <div class="tag-row" v-if="show.genres?.length">
          <span class="tag" v-for="genre in show.genres" :key="genre.id || genre.name">
            {{ genre.name }}
          </span>
        </div>
        <p class="muted" v-if="show.description">{{ show.description }}</p>
        <p class="muted" v-else>暂无简介。</p>
        <div class="detail-meta">
          <div>
            <p class="label">TMDB 评分</p>
            <p class="score">{{ show.rating ?? "--" }}</p>
          </div>
          <div>
            <p class="label">评分人数</p>
            <p class="score">{{ show.rating_count ?? "--" }}</p>
          </div>
          <div>
            <p class="label">季数</p>
            <p class="score">{{ show.seasons ?? "--" }}</p>
          </div>
          <div>
            <p class="label">集数</p>
            <p class="score">{{ show.episodes ?? "--" }}</p>
          </div>
        </div>
      </div>
    </div>

    <section class="section" v-if="show.cast?.length">
      <div class="section-head">
        <h2 class="section-title">主要演员</h2>
      </div>
      <div class="cast-grid">
        <div class="cast-card" v-for="member in show.cast" :key="member.cast_id">
          <img
            v-if="member.profile_url"
            class="cast-avatar"
            :src="member.profile_url"
            :alt="member.name"
            loading="lazy"
          />
          <div v-else class="poster-placeholder cast-avatar placeholder"></div>
          <div>
            <p class="list-title">{{ member.name }}</p>
            <p class="muted">{{ member.character_name || "-" }}</p>
          </div>
        </div>
      </div>
    </section>
  </section>
  <section v-else class="page">
    <div class="card" v-if="errorMessage">
      <h3>无法加载节目</h3>
      <p class="muted">{{ errorMessage }}</p>
      <button class="button secondary" @click="load">重试</button>
    </div>
    <p v-else class="muted">加载中...</p>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api.js";
import PosterImage from "../components/PosterImage.vue";

const route = useRoute();
const show = ref(null);
const errorMessage = ref("");

async function load() {
  errorMessage.value = "";
  try {
    const data = await api.getTvShow(route.params.id);
    show.value = data;
  } catch (err) {
    errorMessage.value = err.message;
  }
}

onMounted(load);
</script>
