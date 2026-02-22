<script lang="ts" setup>
import { promiseTimeout, useIntervalFn } from "@vueuse/core";
import dayjs from "dayjs";
import { ref, watch } from "vue";
import type { SimpleDeparture } from "../services/Wagon";

const props = defineProps<{
  departure: SimpleDeparture;
  canAnimate: boolean;
}>();

const remainingMinutes = ref(-1);

const contextActive = ref(false);
const titleActive = ref(false);
const position = ref<"farAway" | "approaching" | "atPlatform">("farAway");
const minutesZoomedIn = ref(false);

function updatePosition() {
  if (props.departure.arrivesAt.isBefore(dayjs())) {
    position.value = "atPlatform";
  } else if (remainingMinutes.value <= 0) {
    position.value = "approaching";
  } else {
    position.value = "farAway";
  }
}

watch(
  () => props.canAnimate,
  async (active) => {
    if (active) {
      titleActive.value = true;
      await promiseTimeout(1500);
      contextActive.value = true;
    } else {
      contextActive.value = false;
      titleActive.value = false;
    }
  },
  { immediate: true },
);

useIntervalFn(async () => {
  const newRemainingMinutes = props.departure.arrivesAt.diff(dayjs(), "minute");

  if (newRemainingMinutes !== remainingMinutes.value) {
    minutesZoomedIn.value = true;
    await promiseTimeout(1000);
    remainingMinutes.value = newRemainingMinutes;
    minutesZoomedIn.value = false;
  }

  updatePosition();
}, 3000);
</script>

<template>
  <div class="header" :class="{ titleActive, contextActive }">
    <div class="box">
      <div class="text">
        <span>Terminus</span>
        <div class="dynamicSize">
          <div style="overflow: hidden">
            <h1>{{ departure.destination.name }}</h1>
          </div>
        </div>
      </div>
      <div class="minutes">
        <span class="textual" v-if="position === 'atPlatform'">à quai</span>
        <span class="textual" v-else-if="position === 'approaching'">
          à l'approche
        </span>
        <template v-else-if="remainingMinutes <= 60">
          <span class="zoomable" :class="{ minutesZoomedIn }">{{
            Math.max(0, remainingMinutes)
          }}</span>
          <label>min</label>
        </template>
        <span v-else>
          {{ Math.floor(remainingMinutes / 60) }}
          <small>h{{ remainingMinutes % 60 }}</small>
        </span>
      </div>
    </div>
    <div class="contextual">
      <div class="journeyCode" v-if="departure.journeyCode">
        <span>{{ departure.journeyCode }}</span>
      </div>
      <div class="shortTrain" v-if="departure.vehicleLength === 'SHORT'">
        <span>Train court !</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
}

.box {
  display: flex;
}

.text {
  min-width: 60vh;
  max-width: 112vh;
  position: relative;
  z-index: 2;
  padding: 2vh 6vh;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.text span {
  font-size: 4vh;
  color: var(--gray);
}

.dynamicSize {
  display: grid;
  grid-template-columns: 0fr;
  transition: grid-template-columns 1s linear;
}

.titleActive .dynamicSize {
  transition-duration: 1.5s;
}

.titleActive .dynamicSize {
  grid-template-columns: 1fr;
}

h1 {
  padding: 0;
  margin: 0;
  font-size: 9vh;
  color: var(--title-color);
  min-width: 40vh;
  white-space: nowrap;
}

.minutes {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: black;
  min-width: 20vh;
  color: var(--time-color, yellow);
  border-radius: 0 1vh 1vh 0;
  transform: translateX(-100%);
  transition: transform 1s cubic-bezier(0.15, -0.04, 0.08, 0.94);
}

.contextActive .minutes {
  transform: translateX(0);
}

.minutes span {
  display: inline-flex;
  align-items: baseline;
  font-size: 10vh;
}

.minutes small {
  font-size: 6vh;
}

.minutes label {
  margin-top: -1vh;
  font-size: 4vh;
  opacity: 0.7;
}

.minutes .textual {
  padding: 0 4vh;
  font-size: 7vh;
}

.zoomable {
  transition: transform 1s ease-out;
  transition-duration: 0s;
}

.minutesZoomedIn {
  transition-duration: 1s;
  transform: scale(1.25);
}

.contextual {
  transform: translateY(-100%);
  margin-left: 12vh;
  display: flex;
  transition: transform 1s cubic-bezier(0.15, -0.04, 0.08, 0.94);
}

.contextActive .contextual {
  transform: translateY(-0%);
}

.journeyCode {
  padding: 1.4vh 4vh;
  background-color: var(--gray);
  color: white;
  width: fit-content;
  font-size: 4vh;
  border-radius: 0 0 1vh 1vh;
}

.shortTrain {
  padding: 1.4vh 4vh;
  font-size: 4vh;
  margin-left: -1vh;
  background-color: #fec107;
  color: var(--gray, gray);
  font-weight: bold;
  border-bottom-right-radius: 1vh;
  animation: 2.3s blink infinite steps(1);
}

@keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }

  100% {
    opacity: 1;
  }
}
</style>
