<template>
  <section class="page">
    <div class="page-hero compact">
      <div>
        <p class="eyebrow">推荐实验室</p>
        <h1>你的个性化片单</h1>
        <p class="muted">切换算法查看推荐理由与覆盖策略。</p>
      </div>
      <div class="search-panel">
        <select v-model="algorithm" class="input" style="max-width: 220px;">
          <option value="">最新批次</option>
          <option value="hot">热门</option>
          <option value="content">内容推荐</option>
          <option value="cf">协同过滤</option>
          <option value="hybrid">混合推荐</option>
        </select>
        <button class="button" @click="load">刷新</button>
      </div>
    </div>

    <div class="info-card">
      <p class="muted">{{ algoHint }}</p>
    </div>

    <p class="muted" v-if="message">{{ message }}</p>

    <div class="grid" v-if="items.length">
      <article class="movie-card" v-for="item in items" :key="item.movie_id">
        <PosterImage :src="item.poster_url" :alt="item.title" />
        <div class="card-body">
          <div>
            <h3>{{ item.title }}</h3>
            <span class="tag" v-if="item.reason">{{ item.reason }}</span>
          </div>
          <RouterLink class="button secondary" :to="`/movies/${item.movie_id}`">详情</RouterLink>
        </div>
      </article>
    </div>
    <p class="muted" v-else>暂无推荐。</p>
  </section>
</template>

<script setup>
import { ref, computed } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api.js";
import useAuth from "../store/auth.js";
import PosterImage from "../components/PosterImage.vue";

const algorithm = ref("");
const items = ref([]);
const message = ref("");
const { isAuthed } = useAuth();

const algoHint = computed(() => {
  if (!algorithm.value) return "显示最新一批推荐结果。";
  if (algorithm.value === "hot") return "热门：根据近期热度推荐。";
  if (algorithm.value === "content") return "内容：根据影片类型与偏好推荐。";
  if (algorithm.value === "cf") return "协同过滤：相似用户喜欢的内容。";
  if (algorithm.value === "hybrid") return "混合：多策略加权推荐。";
  return "推荐策略说明加载中。";
});

async function load() {
  message.value = "";
  if (!isAuthed.value) {
    items.value = [];
    message.value = "登录后查看推荐。";
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
      message.value = "暂无推荐批次，已展示热门影片。";
    }
  } catch (err) {
    message.value = err.message;
  }
}

load();
</script>
