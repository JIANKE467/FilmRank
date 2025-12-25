<template>
  <section>
    <h2 class="section-title">Register</h2>
    <div class="form-row">
      <input v-model="username" class="input" placeholder="Username" />
      <input v-model="email" class="input" placeholder="Email" />
      <input v-model="password" class="input" type="password" placeholder="Password" />
      <button class="button" @click="submit">Create</button>
    </div>
    <p class="muted" v-if="message">{{ message }}</p>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { api } from "../api.js";

const username = ref("");
const email = ref("");
const password = ref("");
const message = ref("");

async function submit() {
  message.value = "";
  try {
    await api.register({ username: username.value, email: email.value, password: password.value });
    message.value = "Registered. Please login.";
  } catch (err) {
    message.value = err.message;
  }
}
</script>
