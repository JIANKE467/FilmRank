<template>
  <section v-if="movie">
    <h2 class="section-title">{{ movie.title }}</h2>
    <p class="muted">{{ movie.description || "No description" }}</p>
    <div class="form-row">
      <span class="muted">Avg score: {{ rating.avg_score || "-" }}</span>
      <span class="muted">Ratings: {{ rating.rating_count || 0 }}</span>
    </div>

    <div v-if="isAuthed" class="card" style="margin-top: 16px;">
      <h3>Rate this movie</h3>
      <div class="form-row">
        <input v-model="score" class="input" placeholder="Score (0-10)" />
        <button class="button" @click="submitRating">Submit</button>
      </div>
      <p class="muted" v-if="ratingMessage">{{ ratingMessage }}</p>
    </div>

    <div v-if="isAuthed" class="card" style="margin-top: 16px;">
      <h3>Add review</h3>
      <textarea v-model="review" class="input" rows="3" placeholder="Your review"></textarea>
      <button class="button" style="margin-top: 8px;" @click="submitReview">Post</button>
      <p class="muted" v-if="reviewMessage">{{ reviewMessage }}</p>
    </div>

    <div style="margin-top: 16px;">
      <h3>Reviews</h3>
      <div class="card" v-for="item in reviews" :key="item.review_id">
        <p>{{ item.content }}</p>
        <p class="muted">by {{ item.username }}</p>
      </div>
    </div>
  </section>
  <p v-else class="muted">Loading...</p>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api.js";
import useAuth from "../store/auth.js";

const route = useRoute();
const { isAuthed } = useAuth();

const movie = ref(null);
const rating = ref({});
const reviews = ref([]);
const score = ref("");
const review = ref("");
const ratingMessage = ref("");
const reviewMessage = ref("");

async function load() {
  const data = await api.getMovie(route.params.id);
  movie.value = data.movie;
  rating.value = data.rating || {};
  reviews.value = data.reviews || [];
}

async function submitRating() {
  ratingMessage.value = "";
  try {
    await api.rateMovie({ movie_id: movie.value.movie_id, score: Number(score.value) });
    ratingMessage.value = "Rating saved";
    await load();
  } catch (err) {
    ratingMessage.value = err.message;
  }
}

async function submitReview() {
  reviewMessage.value = "";
  try {
    await api.createReview({ movie_id: movie.value.movie_id, content: review.value });
    reviewMessage.value = "Review posted";
    review.value = "";
    await load();
  } catch (err) {
    reviewMessage.value = err.message;
  }
}

onMounted(load);
</script>
