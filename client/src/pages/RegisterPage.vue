<template>
  <section class="page auth-page">
    <div class="card auth-card">
      <h1>创建账号</h1>
      <p class="muted">加入 FilmRank，收藏电影并完善资料。</p>
      <div class="form-stack">
        <input v-model="username" class="input" placeholder="用户名" />
        <input v-model="email" class="input" placeholder="邮箱" />
        <input v-model="password" class="input" type="password" placeholder="密码" />
        <button class="button" @click="submit">创建账号</button>
      </div>
      <p class="muted" v-if="message">{{ message }}</p>
      <RouterLink class="link" to="/login">已有账号？去登录</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api.js";

const username = ref("");
const email = ref("");
const password = ref("");
const message = ref("");

async function submit() {
  message.value = "";
  try {
    await api.register({ username: username.value, email: email.value, password: password.value });
    message.value = "注册成功，请登录。";
  } catch (err) {
    message.value = err.message;
  }
}
</script>
