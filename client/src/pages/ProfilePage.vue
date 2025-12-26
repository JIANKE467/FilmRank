<template>
  <section class="page">
    <div class="page-hero compact">
      <div>
        <p class="eyebrow">个人中心</p>
        <h1>个人仪表盘</h1>
        <p class="muted">查看书签、观看历史与推荐内容。</p>
      </div>
      <div class="profile-actions">
        <button class="button" :disabled="!isAuthed" @click="toggleEdit">
          {{ isEditing ? "取消" : "编辑资料" }}
        </button>
        <button v-if="isEditing" class="button secondary" :disabled="!isAuthed" @click="saveProfile">
          保存
        </button>
        <RouterLink v-if="!isAuthed" class="button secondary" to="/login">登录</RouterLink>
      </div>
    </div>

    <div v-if="!isAuthed" class="card">
      <h3>登录后完善个人信息</h3>
      <p class="muted">登录查看观看历史与推荐内容。</p>
    </div>

    <div v-else class="profile-grid">
      <div class="card profile-card">
        <div class="profile-avatar">{{ initials }}</div>
        <div>
          <h2>{{ state.user?.username }}</h2>
          <p class="muted">角色：{{ state.user?.role || "user" }}</p>
          <p class="muted">邮箱：{{ state.user?.email || "未填写" }}</p>
          <p class="muted" v-if="!isEditing">{{ state.user?.bio || "还没有简介。" }}</p>
        </div>
      </div>

      <div v-if="isEditing" class="card">
        <h3>编辑简介</h3>
        <textarea v-model="bio" class="input" rows="4" placeholder="写一段简短介绍..."></textarea>
        <p class="muted" v-if="profileMessage">{{ profileMessage }}</p>
      </div>

      <div class="stats-card">
        <div class="stat-item">
          <p class="stat-label">观看次数</p>
          <p class="stat-value">{{ watchHistory.length }}</p>
        </div>
        <div class="stat-item">
          <p class="stat-label">书签数</p>
          <p class="stat-value">{{ stats.bookmark_count }}</p>
        </div>
        <div class="stat-item">
          <p class="stat-label">评论数</p>
          <p class="stat-value">{{ stats.review_count }}</p>
        </div>
      </div>
    </div>

    <div v-if="isAuthed" class="split">
      <div>
        <h3 class="section-title">最近观看</h3>
        <div v-if="watchHistory.length" class="stack">
          <div class="card list-row" v-for="item in watchHistory" :key="item.watch_id">
            <PosterImage :src="item.poster_url" :alt="item.title" size="tiny" />
            <div>
              <p class="list-title">{{ item.title }}</p>
              <p class="muted">观看时间 {{ formatDate(item.watched_at) }}</p>
            </div>
          </div>
        </div>
        <p v-else class="muted">暂无观看记录。</p>
      </div>

      <div>
        <h3 class="section-title">你的推荐</h3>
        <div v-if="recommendations.length" class="stack">
          <div class="card list-row" v-for="item in recommendations" :key="item.movie_id">
            <PosterImage :src="item.poster_url" :alt="item.title" size="tiny" />
            <div>
              <p class="list-title">{{ item.title }}</p>
              <p class="muted">{{ item.reason || "为你推荐" }}</p>
            </div>
          </div>
        </div>
        <p v-else class="muted">暂无推荐，多添加书签试试。</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api.js";
import useAuth from "../store/auth.js";
import PosterImage from "../components/PosterImage.vue";

const { state, isAuthed, updateUser } = useAuth();
const watchHistory = ref([]);
const recommendations = ref([]);
const stats = ref({ bookmark_count: 0, review_count: 0 });
const isEditing = ref(false);
const bio = ref("");
const profileMessage = ref("");

const initials = computed(() => {
  const name = state.user?.username || "?";
  return name.slice(0, 2).toUpperCase();
});

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString();
}

async function load() {
  if (!isAuthed.value) return;
  try {
    const [history, recs, me] = await Promise.all([
      api.listWatchHistory(),
      api.listRecommendations(),
      api.getMe()
    ]);
    watchHistory.value = history || [];
    recommendations.value = (recs.items || []).slice(0, 5);
    stats.value = await api.getUserStats();
    if (me) {
      updateUser(me);
      bio.value = me.bio || "";
    }
  } catch (err) {
    watchHistory.value = [];
    recommendations.value = [];
    stats.value = { bookmark_count: 0, review_count: 0 };
  }
}

function toggleEdit() {
  isEditing.value = !isEditing.value;
  profileMessage.value = "";
  if (isEditing.value) {
    bio.value = state.user?.bio || "";
  }
}

async function saveProfile() {
  profileMessage.value = "";
  try {
    const updated = await api.updateMe({ bio: bio.value.trim() });
    updateUser(updated);
    isEditing.value = false;
    profileMessage.value = "资料已更新";
  } catch (err) {
    profileMessage.value = err.message;
  }
}

onMounted(load);
</script>
