<template>
  <section>
    <h2 class="section-title">Admin Console</h2>
    <p class="muted" v-if="message">{{ message }}</p>

    <div class="card" style="margin-bottom: 16px;">
      <h3>Create Movie</h3>
      <div class="form-row">
        <input v-model="movieTitle" class="input" placeholder="Title" />
        <input v-model="movieYear" class="input" placeholder="Year" />
        <button class="button" @click="createMovie">Create</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <h3>Create Genre</h3>
      <div class="form-row">
        <input v-model="genreName" class="input" placeholder="Genre name" />
        <button class="button" @click="createGenre">Create</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <h3>Rating Policy</h3>
      <div class="form-row">
        <input v-model="policyMin" class="input" placeholder="Min score" />
        <input v-model="policyMax" class="input" placeholder="Max score" />
        <input v-model="policyStep" class="input" placeholder="Step" />
        <button class="button" @click="updatePolicy">Apply</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <h3>Generate Recommendations</h3>
      <div class="form-row">
        <select v-model="algo" class="input" style="max-width: 200px;">
          <option value="hot">Hot</option>
          <option value="content">Content</option>
          <option value="cf">CF</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <input v-model="topN" class="input" placeholder="Top N" />
        <button class="button" @click="generate">Generate</button>
      </div>
    </div>

    <div class="card">
      <h3>Users</h3>
      <div class="form-row">
        <input v-model="userQuery" class="input" placeholder="Search username/email" />
        <button class="button" @click="loadUsers">Search</button>
      </div>
      <div v-for="user in users" :key="user.user_id" style="margin-top: 12px;">
        <strong>{{ user.username }}</strong> ({{ user.status }})
        <button class="button secondary" style="margin-left: 8px;" @click="toggleUser(user)">
          {{ user.status === "active" ? "Ban" : "Unban" }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { api } from "../api.js";

const message = ref("");

const movieTitle = ref("");
const movieYear = ref("");

const genreName = ref("");

const policyMin = ref("0");
const policyMax = ref("10");
const policyStep = ref("0.5");

const algo = ref("hot");
const topN = ref("10");

const userQuery = ref("");
const users = ref([]);

async function createMovie() {
  message.value = "";
  try {
    await api.admin.createMovie({ title: movieTitle.value, year: movieYear.value || null });
    message.value = "Movie created";
    movieTitle.value = "";
    movieYear.value = "";
  } catch (err) {
    message.value = err.message;
  }
}

async function createGenre() {
  message.value = "";
  try {
    await api.admin.createGenre({ name: genreName.value });
    message.value = "Genre created";
    genreName.value = "";
  } catch (err) {
    message.value = err.message;
  }
}

async function updatePolicy() {
  message.value = "";
  try {
    await api.admin.setRatingPolicy({
      min_score: Number(policyMin.value),
      max_score: Number(policyMax.value),
      step: Number(policyStep.value),
      allow_update: true
    });
    message.value = "Policy updated";
  } catch (err) {
    message.value = err.message;
  }
}

async function generate() {
  message.value = "";
  try {
    await api.admin.generateBatch({ algorithm: algo.value, top_n: Number(topN.value) });
    message.value = "Batch generated";
  } catch (err) {
    message.value = err.message;
  }
}

async function loadUsers() {
  message.value = "";
  try {
    users.value = await api.admin.listUsers(userQuery.value || "");
  } catch (err) {
    message.value = err.message;
  }
}

async function toggleUser(user) {
  message.value = "";
  try {
    const nextStatus = user.status === "active" ? "banned" : "active";
    await api.admin.setUserStatus(user.user_id, nextStatus);
    user.status = nextStatus;
  } catch (err) {
    message.value = err.message;
  }
}
</script>
