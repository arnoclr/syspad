<script lang="ts" setup>
import { useIntervalFn } from "@vueuse/core";
import dayjs from "dayjs";
import { ref } from "vue";

const time = ref("");

useIntervalFn(() => {
  time.value = dayjs().format("HH:mm");
}, 1000);
</script>

<template>
  <div>
    <span>{{ time }}</span>
  </div>
</template>

<style scoped>
div {
  padding: 1.6vh 3vh;
  background-color: black;
  color: var(--time-color, yellow);
}

span {
  font-size: 6vh;
}
</style>
