<template>
  <section>
    <h2 class="section-title">Explore Movies</h2>
    <div class="form-row">
      <input v-model="query" class="input" placeholder="Search title" />
      <button class="button" @click="load">Search</button>
    </div>
    <p class="muted" v-if="error">{{ error }}</p>
    <div class="grid" v-if="movies.length">
      <div class="card" v-for="movie in movies" :key="movie.movie_id">
        <h3>{{ movie.title }}</h3>
        <p class="muted">{{ movie.year || "-" }} ? {{ movie.language || "-" }}</p>
        <RouterLink class="button secondary" :to="`/movies/${movie.movie_id}`">Details</RouterLink>
      </div>
    </div>
    <p class="muted" v-else>No movies yet.</p>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api.js";

const movies = ref([]);
const query = ref("");
const error = ref("");

async function load() {
  error.value = "";
  try {
    movies.value = await api.listMovies(query.value ? { q: query.value } : {});
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(load);
</script>
