<template>
  <section class="page auth-page">
    <div class="card auth-card">
      <h1>欢迎回来</h1>
      <p class="muted">登录后查看个人资料。</p>
      <div class="form-stack">
        <input v-model="username" class="input" placeholder="用户名" />
        <input v-model="password" class="input" type="password" placeholder="密码" />
        <button class="button" @click="submit">登录</button>
      </div>
      <p class="muted" v-if="message">{{ message }}</p>
      <RouterLink class="link" to="/register">还没有账号？去注册</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { api } from "../api.js";
import useAuth from "../store/auth.js";

const router = useRouter();
const { setAuth } = useAuth();

const username = ref("");
const password = ref("");
const message = ref("");

async function submit() {
  message.value = "";
  try {
    const data = await api.login({ username: username.value, password: password.value });
    setAuth(data.token, data.user);
    router.push("/");
  } catch (err) {
    message.value = err.message;
  }
}
</script>
