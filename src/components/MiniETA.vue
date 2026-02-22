<script lang="ts" setup>
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  eta: Dayjs;
}>();

const remainingMinutes = ref<number>(0);
let intervalId: number;

function updateRemainingMinutes() {
  remainingMinutes.value = props.eta.diff(dayjs(), "minute");
}

onMounted(() => {
  updateRemainingMinutes();
  intervalId = setInterval(updateRemainingMinutes, 60000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>

<template>
  <article>
    <span>{{ remainingMinutes }}</span>
    <span>min</span>
  </article>
</template>

<style scoped>
article {
  box-sizing: border-box;
  padding: 1vh;
  height: 8vh;
  width: 8vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: black;
  color: var(--time-color);
  border-radius: 0.8vh;
  transform: translate(65%, -50%);
  z-index: 999;
}

span:first-child {
  font-size: 4.6vh;
  line-height: 4vh;
}

span:last-child {
  font-size: 2vh;
}
</style>
