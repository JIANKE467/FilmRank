<template>
  <section>
    <h2 class="section-title">Your Recommendations</h2>
    <div class="form-row">
      <select v-model="algorithm" class="input" style="max-width: 200px;">
        <option value="">Latest</option>
        <option value="hot">Hot</option>
        <option value="content">Content</option>
        <option value="cf">CF</option>
        <option value="hybrid">Hybrid</option>
      </select>
      <button class="button" @click="load">Refresh</button>
    </div>
    <p class="muted" v-if="message">{{ message }}</p>
    <div class="grid" v-if="items.length">
      <div class="card" v-for="item in items" :key="item.movie_id">
        <h3>{{ item.title }}</h3>
        <p class="muted">Score: {{ item.score.toFixed(2) }}</p>
        <p class="muted">{{ item.reason || "" }}</p>
      </div>
    </div>
    <p class="muted" v-else>No recommendations yet.</p>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { api } from "../api.js";

const algorithm = ref("");
const items = ref([]);
const message = ref("");

async function load() {
  message.value = "";
  try {
    const data = await api.listRecommendations(algorithm.value || undefined);
    items.value = data.items || [];
    if (!data.batch) {
      message.value = "No recommendation batch found.";
    }
  } catch (err) {
    message.value = err.message;
  }
}

load();
</script>
