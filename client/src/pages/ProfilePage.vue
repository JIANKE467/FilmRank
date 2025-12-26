<template>
  <section class="page">
    <div class="page-hero compact">
      <div>
        <p class="eyebrow">个人中心</p>
        <h1>个人仪表盘</h1>
        <p class="muted">查看书签与推荐内容。</p>
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
      <p class="muted">登录查看收藏与推荐内容。</p>
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
          <p class="stat-label">收藏数</p>
          <p class="stat-value">{{ favoritesTotal }}</p>
        </div>
        <div class="stat-item">
          <p class="stat-label">书签数</p>
          <p class="stat-value">{{ stats.bookmark_count }}</p>
        </div>
      </div>
    </div>

    <div v-if="isAuthed" class="split">
      <div>
        <h3 class="section-title">收藏记录</h3>
        <div v-if="favorites.length" class="stack">
          <div class="card list-row" v-for="item in favorites" :key="item.bookmark_id">
            <PosterImage :src="item.poster_url" :alt="item.title" size="tiny" />
            <div>
              <p class="list-title">{{ item.title }}</p>
              <p class="muted">收藏时间 {{ formatDate(item.updated_at) }}</p>
            </div>
            <button class="button ghost" @click="removeBookmark(item.movie_id)">清除</button>
          </div>
        </div>
        <p v-else class="muted">暂无收藏记录。</p>
        <div class="pager" v-if="favoritesTotal > pageSize">
          <button class="button ghost" :disabled="favoritesPage === 1" @click="prevFavorites">上一页</button>
          <span class="muted">{{ favoritesPage }} / {{ Math.ceil(favoritesTotal / pageSize) }}</span>
          <button
            class="button ghost"
            :disabled="favoritesPage >= Math.ceil(favoritesTotal / pageSize)"
            @click="nextFavorites"
          >
            下一页
          </button>
        </div>
      </div>

      <div>
        <h3 class="section-title">书签记录</h3>
        <div v-if="notes.length" class="stack">
          <div class="card list-row" v-for="item in notes" :key="item.bookmark_id">
            <PosterImage :src="item.poster_url" :alt="item.title" size="tiny" />
            <div>
              <p class="list-title">{{ item.title }}</p>
              <p class="muted">书签时间 {{ formatDate(item.updated_at) }}</p>
              <p class="muted" v-if="item.note">{{ item.note }}</p>
            </div>
            <button class="button ghost" @click="removeBookmark(item.movie_id)">清除</button>
          </div>
        </div>
        <p v-else class="muted">暂无书签记录。</p>
        <div class="pager" v-if="notesTotal > pageSize">
          <button class="button ghost" :disabled="notesPage === 1" @click="prevNotes">上一页</button>
          <span class="muted">{{ notesPage }} / {{ Math.ceil(notesTotal / pageSize) }}</span>
          <button
            class="button ghost"
            :disabled="notesPage >= Math.ceil(notesTotal / pageSize)"
            @click="nextNotes"
          >
            下一页
          </button>
        </div>
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
const favorites = ref([]);
const notes = ref([]);
const stats = ref({ bookmark_count: 0, review_count: 0 });
const isEditing = ref(false);
const bio = ref("");
const profileMessage = ref("");
const favoritesPage = ref(1);
const notesPage = ref(1);
const pageSize = 6;
const favoritesTotal = ref(0);
const notesTotal = ref(0);

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
    const [favoriteRes, noteRes, me] = await Promise.all([
      api.listBookmarks({ type: "favorite", page: favoritesPage.value, page_size: pageSize }),
      api.listBookmarks({ type: "note", page: notesPage.value, page_size: pageSize }),
      api.getMe()
    ]);
    favorites.value = favoriteRes.items || [];
    notes.value = noteRes.items || [];
    favoritesTotal.value = favoriteRes.total || 0;
    notesTotal.value = noteRes.total || 0;
    stats.value = await api.getUserStats();
    if (me) {
      updateUser(me);
      bio.value = me.bio || "";
    }
  } catch (err) {
    favorites.value = [];
    notes.value = [];
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

function nextFavorites() {
  if (favoritesPage.value < Math.ceil(favoritesTotal.value / pageSize)) {
    favoritesPage.value += 1;
    load();
  }
}

function prevFavorites() {
  if (favoritesPage.value > 1) {
    favoritesPage.value -= 1;
    load();
  }
}

function nextNotes() {
  if (notesPage.value < Math.ceil(notesTotal.value / pageSize)) {
    notesPage.value += 1;
    load();
  }
}

function prevNotes() {
  if (notesPage.value > 1) {
    notesPage.value -= 1;
    load();
  }
}

async function removeBookmark(movieId) {
  try {
    await api.deleteBookmark(movieId);
    const inFavorites = favorites.value.some((item) => item.movie_id === movieId);
    const inNotes = notes.value.some((item) => item.movie_id === movieId);
    favorites.value = favorites.value.filter((item) => item.movie_id !== movieId);
    notes.value = notes.value.filter((item) => item.movie_id !== movieId);
    if (inNotes) {
      stats.value = { ...stats.value, bookmark_count: Math.max(stats.value.bookmark_count - 1, 0) };
    }
    if (inFavorites) {
      favoritesTotal.value = Math.max(favoritesTotal.value - 1, 0);
    }
    if (inNotes) {
      notesTotal.value = Math.max(notesTotal.value - 1, 0);
    }
  } catch {
    // Ignore failures for now.
  }
}
</script>
