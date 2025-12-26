<template>
  <div class="poster-frame" :class="size">
    <img
      v-if="src && !hasError"
      class="poster-img"
      :src="src"
      :alt="alt"
      loading="lazy"
      decoding="async"
      @error="hasError = true"
    />
    <div v-else class="poster-placeholder"></div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  src: {
    type: String,
    default: ""
  },
  alt: {
    type: String,
    default: "Movie poster"
  },
  size: {
    type: String,
    default: ""
  }
});

const hasError = ref(false);
</script>
