<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">FilmRank</div>
      <nav class="nav-links">
        <RouterLink to="/">Movies</RouterLink>
        <RouterLink to="/recommendations">Recommendations</RouterLink>
        <RouterLink v-if="isAdmin" to="/admin">Admin</RouterLink>
        <RouterLink v-if="!isAuthed" to="/login">Login</RouterLink>
        <RouterLink v-if="!isAuthed" to="/register">Register</RouterLink>
        <button v-if="isAuthed" class="button secondary" @click="logout">Logout</button>
      </nav>
    </header>
    <main class="container">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router";
import useAuth from "./store/auth.js";

const { clearAuth, isAuthed, isAdmin } = useAuth();

function logout() {
  clearAuth();
}
</script>
