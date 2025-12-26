<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">FR</span>
        <div>
          <div class="brand-title">FilmRank</div>
          <div class="brand-subtitle">发现 · 收藏 · 推荐</div>
        </div>
      </div>
      <nav class="nav-links">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/search">搜索</RouterLink>
        <RouterLink to="/profile">我的</RouterLink>
        <RouterLink v-if="isAdmin" to="/admin">管理</RouterLink>
        <RouterLink v-if="!isAuthed" to="/login">登录</RouterLink>
        <RouterLink v-if="!isAuthed" to="/register">注册</RouterLink>
        <button v-if="isAuthed" class="button secondary" @click="logout">退出</button>
      </nav>
    </header>
    <main class="container">
      <RouterView />
    </main>
    <footer class="footer">
      <div class="footer-content">
        <div>
          <div class="footer-title">FilmRank</div>
          <p class="muted">发现、收藏与推荐电影的精选空间。</p>
        </div>
        <div class="footer-links">
          <span>Copyright (c) 2025 FilmRank</span>
          <span>隐私</span>
          <span>条款</span>
        </div>
      </div>
    </footer>
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
