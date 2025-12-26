<template>
  <section class="page">
    <div class="page-hero compact">
      <div>
        <p class="eyebrow">Recommendation Lab</p>
        <h1>Your personalized feed</h1>
        <p class="muted">Switch algorithms to see why the system surfaces each film.</p>
      </div>
      <div class="search-panel">
        <select v-model="algorithm" class="input" style="max-width: 220px;">
          <option value="">Latest batch</option>
          <option value="hot">Hot</option>
          <option value="content">Content-based</option>
          <option value="cf">Collaborative filtering</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <button class="button" @click="load">Refresh</button>
      </div>
    </div>

    <p class="muted" v-if="message">{{ message }}</p>

    <div class="grid" v-if="items.length">
      <article class="movie-card" v-for="item in items" :key="item.movie_id">
        <PosterImage :src="item.poster_url" :alt="item.title" />
        <div class="card-body">
          <div>
            <h3>{{ item.title }}</h3>
            <p class="muted" v-if="item.score !== undefined && item.score !== null">
              Score: {{ item.score.toFixed(2) }}
            </p>
            <p class="muted" v-else>Trending pick</p>
            <span class="tag" v-if="item.reason">{{ item.reason }}</span>
          </div>
          <RouterLink class="button secondary" :to="`/movies/${item.movie_id}`">Details</RouterLink>
        </div>
      </article>
    </div>
    <p class="muted" v-else>No recommendations yet.</p>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api.js";
import useAuth from "../store/auth.js";
import PosterImage from "../components/PosterImage.vue";

const algorithm = ref("");
const items = ref([]);
const message = ref("");
const { isAuthed } = useAuth();

async function load() {
  message.value = "";
  if (!isAuthed.value) {
    items.value = [];
    message.value = "Login to view recommendations.";
    return;
  }
  try {
    const data = await api.listRecommendations(algorithm.value || undefined);
    items.value = data.items || [];
    if (!data.batch) {
      const hot = await api.listMovies({ sort: "hot", limit: 12 });
      items.value = (hot || []).map((movie) => ({
        ...movie,
        reason: "Trending now"
      }));
      message.value = "No recommendation batch found. Showing trending picks instead.";
    }
  } catch (err) {
    message.value = err.message;
  }
}

load();
</script>
