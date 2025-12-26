<template>
  <section class="page">
    <div class="page-hero compact">
      <div>
        <p class="eyebrow">管理控制台</p>
        <h1>管理 FilmRank 影片库</h1>
        <p class="muted">用户管理、影片维护与推荐批次生成。</p>
      </div>
      <div class="profile-actions">
        <button class="button" @click="loadUsers">刷新用户</button>
      </div>
    </div>

    <p class="muted" v-if="message">{{ message }}</p>

    <div class="admin-grid">
      <div class="card">
        <h3>影片管理</h3>
        <div class="form-stack">
          <input v-model="movieTitle" class="input" placeholder="片名" />
          <input v-model="movieYear" class="input" placeholder="年份" />
          <input v-model="movieLanguage" class="input" placeholder="语言" />
          <input v-model="moviePoster" class="input" placeholder="海报链接" />
          <textarea v-model="movieDescription" class="input" rows="3" placeholder="简介"></textarea>
          <button class="button" @click="createMovie">创建影片</button>
        </div>
        <div class="divider"></div>
        <div class="form-stack">
          <input v-model="updateMovieId" class="input" placeholder="影片 ID" />
          <input v-model="updateTitle" class="input" placeholder="新片名" />
          <input v-model="updateYear" class="input" placeholder="新年份" />
          <button class="button secondary" @click="updateMovie">更新影片</button>
        </div>
        <div class="divider"></div>
        <div class="form-stack">
          <input v-model="bindMovieId" class="input" placeholder="影片 ID" />
          <input v-model="bindGenres" class="input" placeholder="类型 ID（逗号分隔）" />
          <button class="button secondary" @click="bindMovieGenres">绑定类型</button>
        </div>
      </div>

      <div class="card">
        <h3>用户管理</h3>
        <div class="form-row">
          <input v-model="userQuery" class="input" placeholder="搜索用户名/邮箱" />
          <button class="button" @click="loadUsers">搜索</button>
        </div>
        <div class="stack" v-if="users.length">
          <div v-for="user in users" :key="user.user_id" class="list-row">
            <div>
              <p class="list-title">{{ user.username }}</p>
              <p class="muted">{{ user.email || "未填写邮箱" }}</p>
            </div>
            <button class="button ghost" @click="toggleUser(user)">
              {{ user.status === "active" ? "禁用" : "解禁" }}
            </button>
          </div>
        </div>
        <p v-else class="muted">暂无用户。</p>
      </div>

      <div class="card">
        <h3>评论审核</h3>
        <div class="form-stack">
          <input v-model="reviewId" class="input" placeholder="评论 ID" />
          <select v-model="reviewStatus" class="input">
            <option value="visible">显示</option>
            <option value="hidden">隐藏</option>
          </select>
          <button class="button" @click="updateReviewStatus">应用</button>
        </div>
      </div>

      <div class="card">
        <h3>类型管理</h3>
        <div class="form-row">
          <input v-model="genreName" class="input" placeholder="类型名称" />
          <button class="button" @click="createGenre">创建</button>
        </div>
        <div class="form-row">
          <input v-model="genreId" class="input" placeholder="类型 ID" />
          <input v-model="genreUpdate" class="input" placeholder="新名称" />
          <button class="button secondary" @click="updateGenre">更新</button>
        </div>
      </div>

      <div class="card">
        <h3>评分策略</h3>
        <div class="form-row">
          <input v-model="policyMin" class="input" placeholder="最小分" />
          <input v-model="policyMax" class="input" placeholder="最大分" />
          <input v-model="policyStep" class="input" placeholder="步长" />
          <button class="button" @click="updatePolicy">应用</button>
        </div>
      </div>

      <div class="card">
        <h3>生成推荐</h3>
        <div class="form-row">
          <select v-model="algo" class="input" style="max-width: 200px;">
            <option value="hot">热门</option>
            <option value="content">内容</option>
            <option value="cf">CF</option>
            <option value="hybrid">混合</option>
          </select>
          <input v-model="topN" class="input" placeholder="数量" />
          <button class="button" @click="generate">生成</button>
        </div>
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
const movieLanguage = ref("");
const moviePoster = ref("");
const movieDescription = ref("");

const updateMovieId = ref("");
const updateTitle = ref("");
const updateYear = ref("");

const bindMovieId = ref("");
const bindGenres = ref("");

const genreName = ref("");
const genreId = ref("");
const genreUpdate = ref("");

const policyMin = ref("0");
const policyMax = ref("10");
const policyStep = ref("0.5");

const algo = ref("hot");
const topN = ref("10");

const userQuery = ref("");
const users = ref([]);

const reviewId = ref("");
const reviewStatus = ref("hidden");

async function createMovie() {
  message.value = "";
  try {
    await api.admin.createMovie({
      title: movieTitle.value,
      year: movieYear.value || null,
      language: movieLanguage.value || null,
      poster_url: moviePoster.value || null,
      description: movieDescription.value || null
    });
    message.value = "影片已创建";
    movieTitle.value = "";
    movieYear.value = "";
    movieLanguage.value = "";
    moviePoster.value = "";
    movieDescription.value = "";
  } catch (err) {
    message.value = err.message;
  }
}

async function updateMovie() {
  message.value = "";
  try {
    await api.admin.updateMovie(updateMovieId.value, {
      title: updateTitle.value || undefined,
      year: updateYear.value || undefined
    });
    message.value = "影片已更新";
    updateMovieId.value = "";
    updateTitle.value = "";
    updateYear.value = "";
  } catch (err) {
    message.value = err.message;
  }
}

async function bindMovieGenres() {
  message.value = "";
  try {
    const ids = bindGenres.value
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id));
    await api.admin.bindGenres(bindMovieId.value, { genre_ids: ids });
    message.value = "类型已绑定";
    bindMovieId.value = "";
    bindGenres.value = "";
  } catch (err) {
    message.value = err.message;
  }
}

async function createGenre() {
  message.value = "";
  try {
    await api.admin.createGenre({ name: genreName.value });
    message.value = "类型已创建";
    genreName.value = "";
  } catch (err) {
    message.value = err.message;
  }
}

async function updateGenre() {
  message.value = "";
  try {
    await api.admin.updateGenre(genreId.value, { name: genreUpdate.value });
    message.value = "类型已更新";
    genreId.value = "";
    genreUpdate.value = "";
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
    message.value = "评分策略已更新";
  } catch (err) {
    message.value = err.message;
  }
}

async function generate() {
  message.value = "";
  try {
    await api.admin.generateBatch({ algorithm: algo.value, top_n: Number(topN.value) });
    message.value = "推荐批次已生成";
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

async function updateReviewStatus() {
  message.value = "";
  try {
    await api.admin.setReviewStatus(reviewId.value, reviewStatus.value);
    message.value = "评论状态已更新";
    reviewId.value = "";
  } catch (err) {
    message.value = err.message;
  }
}
</script>
