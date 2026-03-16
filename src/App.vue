<script setup lang="ts">
import { computedAsync, promiseTimeout, useTimeout } from "@vueuse/core";
import { Dayjs } from "dayjs";
import { computed, onMounted, ref, watch } from "vue";
import Header from "./components/Header.vue";
import MiniETA from "./components/MiniETA.vue";
import OfflineHeader from "./components/OfflineHeader.vue";
import RepairScreen from "./components/RepairScreen.vue";
import ShortTrainBubble from "./components/ShortTrainBubble.vue";
import Stops from "./components/Stops.vue";
import Time from "./components/Time.vue";
import { useArrivingStatus } from "./composables/useArrivingStatus";
import { useJourneys } from "./composables/useJourneys";
import { extractNextUniqueDepartures } from "./journeys";
import { getFixedPosition } from "./layout";
import type { SimpleDeparture } from "./services/Wagon";
import type { ApplicationParams } from "./types";

interface MiniETAPosition {
  x: number;
  y: number;
  eta: Dayjs;
}

const params = ref<ApplicationParams>(null);
const nextDeparture = ref<SimpleDeparture | undefined>(undefined);
const { journeys, nextDepartureIsInPast } = useJourneys(params);

const miniETAs = computedAsync<MiniETAPosition[]>(async () => {
  if (!journeys.value) return [];
  const departures = extractNextUniqueDepartures(journeys.value);
  await promiseTimeout(10000);
  console.log(departures);
  return departures.map((departure) => {
    const anchor = document.getElementById(departure.terminusId);
    console.log(anchor);
    if (!anchor) {
      return {
        x: -999,
        y: -999,
        eta: departure.eta,
      };
    }
    const { x, y } = getFixedPosition(anchor);
    return {
      x,
      y,
      eta: departure.eta,
    };
  });
}, []);

const lineLogo = computed(() => journeys.value?.at(0)?.line.numberShapeSvg);

const { ready: canAnimate, start: preventAnimation } = useTimeout(4000, {
  controls: true,
});

const { status, remainingMinutes } = useArrivingStatus(nextDeparture);

onMounted(async () => {
  setTimeout(
    () => {
      window.location.reload();
    },
    1000 * 60 * 60 * 18,
  );

  const urlParams = new URLSearchParams(window.location.search);
  const terminusPosition = urlParams.get("to")?.split(",").map(parseFloat);

  params.value = {
    currentStopId: urlParams.get("from") ?? "",
    lineId: urlParams.get("route") ?? "",
    terminusPosition: terminusPosition
      ? { lat: terminusPosition[0], lon: terminusPosition[1] }
      : undefined,
    shortTrainMessage: urlParams.get("shortTrainMessage") ?? undefined,
  };
});

watch(
  () => journeys.value?.at(0)?.stops.reduce((acc, stop) => acc + stop.id, ""),
  async () => {
    preventAnimation();
    await promiseTimeout(1500);
    nextDeparture.value = journeys.value?.at(0)?.userStopDeparture;
  },
);
</script>

<template>
  <template v-if="lineLogo">
    <Time class="time"></Time>
    <div class="logo" v-html="lineLogo"></div>
    <template v-if="nextDeparture">
      <OfflineHeader
        v-if="nextDepartureIsInPast"
        class="header"
      ></OfflineHeader>
      <Header
        v-else
        :can-animate="canAnimate"
        class="header"
        :departure="nextDeparture"
        :remaining-minutes="remainingMinutes"
        :position="status"
      ></Header>
      <Stops
        :can-animate="canAnimate"
        :mode="
          nextDepartureIsInPast
            ? 'noData'
            : status === 'atPlatform'
              ? 'atPlatform'
              : 'dynamic'
        "
        v-if="journeys"
        :journeys="journeys"
      ></Stops>
      <ShortTrainBubble
        v-if="
          nextDeparture.vehicleLength === 'SHORT' &&
          ['left', 'right'].includes(params?.shortTrainMessage ?? '')
        "
        :walk-to="params?.shortTrainMessage === 'right' ? 'right' : 'left'"
        class="shortTrainBubble"
        :class="params?.shortTrainMessage"
      ></ShortTrainBubble>
      <MiniETA
        :style="{
          position: 'absolute',
          top: `${miniETA.y}px`,
          left: `${miniETA.x}px`,
        }"
        v-for="miniETA in miniETAs"
        v-show="canAnimate"
        :key="miniETA.x + miniETA.y"
        :eta="miniETA.eta"
      ></MiniETA>
    </template>
  </template>
  <RepairScreen v-else></RepairScreen>
</template>

<style scoped>
.time {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9999;
}

.header {
  position: fixed;
  top: 7vh;
  left: 27vh;
  z-index: 999;
}

.logo {
  position: fixed;
  top: -4vh;
  left: -4vh;
  height: 40vh;
}

.shortTrainBubble {
  position: fixed;
  top: -20vh;
  z-index: 999;
}

.shortTrainBubble.right {
  left: 20vh;
}

.shortTrainBubble.left {
  right: 20vh;
}
</style>
