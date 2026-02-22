<script setup lang="ts">
import {
  computedAsync,
  promiseTimeout,
  useDocumentVisibility,
  useIntervalFn,
  useTimeout,
} from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import Header from "./components/Header.vue";
import Stops from "./components/Stops.vue";
import Time from "./components/Time.vue";
import { nextTrainJourneys } from "./fetch";
import type { SimpleDeparture, SimpleJourney } from "./services/Wagon";
import RepairScreen from "./components/RepairScreen.vue";
import dayjs, { Dayjs } from "dayjs";
import OfflineHeader from "./components/OfflineHeader.vue";
import ShortTrainBubble from "./components/ShortTrainBubble.vue";
import MiniETA from "./components/MiniETA.vue";
import { getFixedPosition } from "./layout";
import { extractNextUniqueDepartures } from "./journeys";

interface MiniETAPosition {
  x: number;
  y: number;
  eta: Dayjs;
}

const journeys = ref<SimpleJourney[] | null>(null);
const nextDeparture = ref<SimpleDeparture | undefined>(undefined);

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

const params = ref<{
  currentStopId: string;
  lineId: string;
  terminusPosition: { lat: number; lon: number } | undefined;
  shortTrainMessage?: "right" | "left" | string;
} | null>(null);

const lineLogo = computed(() => journeys.value?.at(0)?.line.numberShapeSvg);

const { ready: canAnimate, start: preventAnimation } = useTimeout(4000, {
  controls: true,
});

const visibility = useDocumentVisibility();
const lastUpdate = ref(dayjs());
const nextDepartureIsInPast = ref(true);

async function updateJourneys() {
  if (params.value === null) return;
  if (visibility.value !== "visible") return;

  journeys.value = await nextTrainJourneys(
    params.value.currentStopId,
    params.value.lineId,
    params.value.terminusPosition,
    journeys.value || [],
  );

  lastUpdate.value = dayjs();
  nextDepartureIsInPast.value =
    journeys.value
      ?.at(0)
      ?.userStopDeparture.leavesAt.isBefore(dayjs().subtract(1, "minute")) ??
    true;
}

const interval = useIntervalFn(async () => {
  await updateJourneys();
}, 61 * 1000);

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

  await updateJourneys();
});

watch(
  () => journeys.value?.at(0)?.stops.reduce((acc, stop) => acc + stop.id, ""),
  async () => {
    preventAnimation();
    await promiseTimeout(1500);
    nextDeparture.value = journeys.value?.at(0)?.userStopDeparture;
  },
);

watch(visibility, async (value) => {
  if (
    value === "visible" &&
    lastUpdate.value.isBefore(dayjs().subtract(1, "minute"))
  ) {
    await updateJourneys();
  }
});
</script>

<template>
  <template v-if="lineLogo && interval.isActive">
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
      ></Header>
      <Stops
        :can-animate="canAnimate"
        :static="nextDepartureIsInPast"
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
