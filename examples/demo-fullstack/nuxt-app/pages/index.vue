<template>
  <div>
    <Header />
    <h1>Welcome to Nuxt Demo</h1>
    <p>Count: {{ count }}</p>
    <button @click="increment">+1</button>
  </div>
</template>

<script setup lang="ts">
const { count, increment } = useCounter();
</script>
