<script lang="ts" setup>
import { promiseTimeout } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { Graph } from "../app/Graph";
import { isInParis } from "../geo";
import { getFixedPosition } from "../layout";
import type { SimpleJourney, SimpleStop } from "../services/Wagon";
import AnimatedPath from "./AnimatedPath.vue";
import StopName from "./StopName.vue";

const props = defineProps<{
  journeys: SimpleJourney[];
  canAnimate: boolean;
  static: boolean;
}>();

const paths = ref<
  {
    points: { x: number; y: number }[];
    isAnimated: boolean;
    isInactive: boolean;
  }[]
>([]);

const stops = computed<Graph<SimpleStop>>(() => {
  const graph = new Graph<SimpleStop>((x) => x.id);

  for (const journey of props.journeys) {
    graph.add(journey.stops);
  }

  return graph;
});

const skippedStops = computed(
  () => props.journeys.at(0)?.skippedStops || new Set<string>()
);

// const closedStops = computed(() =>
//   props.journeys.reduce((acc, journey) => {
//     for (const id of journey.closedStops) {
//       acc.add(id);
//     }

//     return acc;
//   }, new Set<SimpleStop["id"]>())
// );

const stopsInParis = computed(() => {
  return props.journeys.at(0)?.stops.filter((stop) => isInParis(stop)) || [];
});

const someStopsOutOfScreen = ref(false);

function checkIfSomeStopsAreOutOfScreen() {
  for (const journey of props.journeys) {
    for (const stop of journey.stops) {
      const element = document.getElementById(stop.id);
      if (!element) {
        continue;
      }

      const { x, y } = getFixedPosition(element);

      if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
        someStopsOutOfScreen.value = true;
        return;
      }
    }
  }

  someStopsOutOfScreen.value = false;
}

const nextDesservedStops = computed(() => {
  const stops = new Set<SimpleStop["id"]>();

  for (const stop of props.journeys.at(0)?.stops ?? []) {
    stops.add(stop.id);
  }

  return stops;
});

function isStopHidden(
  floor: SimpleStop[],
  i: number,
  stop: SimpleStop
): boolean {
  if (someStopsOutOfScreen.value === false || props.static) {
    return false;
  }

  return i !== floor.length - 1 && !nextDesservedStops.value.has(stop.id);
}

const line = computed(() => props.journeys.at(0)?.line);

function meanLatitude(stops: SimpleStop[]): number {
  return stops.reduce((acc, stop) => acc + stop.position.lat, 0) / stops.length;
}

function northToSouth(a: SimpleStop[], b: SimpleStop[]): number {
  return meanLatitude(b) - meanLatitude(a);
}

function updatePaths() {
  const _paths = [];

  for (const journey of props.journeys) {
    const points = journey.stops.flatMap((stop) => {
      const element = document.getElementById(stop.id);
      if (!element) {
        return { x: 0, y: 0 };
      }

      const visualBalancer = document.getElementById(
        `visual-balancer-${stop.id}`
      );

      if (visualBalancer) {
        return [getFixedPosition(element), getFixedPosition(visualBalancer)];
      }

      return getFixedPosition(element);
    });

    _paths.push({
      points,
      isAnimated: true,
      isInactive: false,
    });
  }

  paths.value = _paths;
}

const parisCirclePosition = ref({ xLeft: "0vh", xRight: "0vh", y: "0vh" });

function updateParisCirclePosition() {
  const [first, last] = [stopsInParis.value.at(0), stopsInParis.value.at(-1)];

  function _getFixedPosition(stop: SimpleStop) {
    const element = document.getElementById(stop.id);
    if (!element) {
      return { x: 0, y: 0 };
    }

    return getFixedPosition(element);
  }

  const firstStopIsInParis =
    first?.id === nextDesservedStops.value.values().next().value;

  parisCirclePosition.value = {
    xLeft:
      first && !firstStopIsInParis
        ? _getFixedPosition(first).x + "px"
        : "-20vh",
    xRight: last ? _getFixedPosition(last).x + "px" : "-20vh",
    y: last ? _getFixedPosition(last).y + "px" : "50vh",
  };
}

function backgroundColor(stopId: string) {
  if (nextDesservedStops.value.values().next().value === stopId) {
    return "var(--title-color)";
  }

  if (
    [...nextDesservedStops.value.values()].at(-1) === stopId &&
    !props.static
  ) {
    return "white";
  }
}

watch(
  () =>
    props.journeys
      .at(0)
      ?.stops.reduce((acc, stop) => acc + stop.position.lat, 0),
  async () => {
    await promiseTimeout(200);
    someStopsOutOfScreen.value = false;
    await promiseTimeout(200);
    checkIfSomeStopsAreOutOfScreen();
    await promiseTimeout(200);
    updateParisCirclePosition();
    await promiseTimeout(500);
    updatePaths();
  },
  { immediate: true }
);
</script>

<template>
  <div class="paths">
    <AnimatedPath
      :points="path.points"
      :color="line?.backgroundColor ?? '000000'"
      :is-animated="i === 0 && canAnimate"
      :is-inactive="false"
      :can-animate="canAnimate"
      :static="static"
      v-for="(path, i) in paths"
    ></AnimatedPath>
  </div>
  <div
    v-if="stopsInParis.length > 0"
    class="circle"
    :style="{
      '--top': parisCirclePosition.y,
      '--left': parisCirclePosition.xLeft,
      '--right': parisCirclePosition.xRight,
    }"
  >
    <span>Paris</span>
  </div>
  <div
    class="groups"
    :class="{ compact: someStopsOutOfScreen, hidden: !canAnimate, static }"
    :style="{ '--line-color': '#' + (line?.backgroundColor ?? '000000') }"
  >
    <div class="floors" v-for="(group, i) in stops.groupedTopologicalPaths">
      <div
        class="floor"
        v-for="(floor, _) in group.sort(northToSouth)"
        :style="{
          gap: someStopsOutOfScreen ? '3vh' : 12 / group.length + 'vh',
        }"
      >
        <div
          class="stop"
          v-for="(stop, k) in floor"
          :class="{
            active:
              nextDesservedStops.has(stop.id) && !skippedStops.has(stop.id),
            hidden: i === 0 && k === 0,
            origin: stop.id === nextDesservedStops.values().next().value,
            terminus: stop.id === [...nextDesservedStops.values()].at(-1),
            appear: canAnimate,
          }"
          :style="{
            '--animation-delay': `${
              nextDesservedStops.has(stop.id)
                ? [...nextDesservedStops.values()].indexOf(stop.id) *
                    (4.5 / nextDesservedStops.size) +
                  2.5
                : 11
            }s`,
            '--group-count': group.length,
            '--position': i,
          }"
        >
          <StopName
            :compact="isStopHidden(floor, k, stop)"
            class="label"
            :char-limit="20"
            :name="stop.name"
            :is-inactive="
              (!nextDesservedStops.has(stop.id) || skippedStops.has(stop.id)) &&
              !static
            "
            :background-color="backgroundColor(stop.id)"
          ></StopName>
          <div class="anchor" :id="stop.id"></div>
          <div
            class="dot"
            :class="{
              animated: backgroundColor(stop.id) === 'var(--title-color)',
            }"
          ></div>
        </div>
        <div class="stop" v-if="group.length > 1 && floor.length === 1">
          <StopName
            :name="group.at(0)?.at(-1)?.name || ''"
            :char-limit="20"
            :is-inactive="false"
            :compact="false"
          ></StopName>
          <div class="anchor" :id="'visual-balancer-' + floor.at(0)?.id"></div>
          <div class="dot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.groups {
  padding-top: 30vh;
  /* transform: translateY(-10%); */
  position: relative;
  padding-left: 8vh;
  display: flex;
  gap: 40vh;
  height: 60vh;
  max-width: calc(100vw - 32vh);
  width: fit-content;
  justify-content: space-between;
  z-index: 99;
}

.groups.hidden {
  opacity: 0;
}

.floors {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.groups:not(.compact) .floors:first-child {
  /* min-width: 120vh; */
}

.floor:only-child {
  margin: auto 0;
}

.floor {
  display: flex;
  justify-content: space-between;
}

.floors:last-child .floor {
  justify-content: start;
}

.stop {
  position: relative;
  opacity: 0;
}

.stop.appear {
  animation: stopAppear 2s ease-out var(--animation-delay) forwards;
}

@keyframes stopAppear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.stop.appear .label {
  animation: labelAppear 0.5s ease-out var(--animation-delay) forwards;
}

@keyframes labelAppear {
  from {
    scale: 1.3;
  }
  to {
    scale: 1;
  }
}

.stop:only-child {
  margin: auto 0;
}

.dot {
  position: relative;
  width: 4.5vh;
  height: 4.5vh;
  background-color: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 99;
}

.dot.animated {
  animation: dotBounce 1.6s infinite;
  box-shadow: 0 0 0 0.4vh var(--title-color);
}

@keyframes dotBounce {
  0% {
    transform: translate(-50%, -50%) scale(1.4);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.6);
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
  }
}

.groups:not(.static) .stop.active.terminus .dot {
  background-color: var(--line-color);
  box-shadow: 0 0 0 0.5vh var(--line-color);
}

.stop.hidden:not(.active) {
  visibility: hidden;
}

.groups:not(.static) .stop:not(.active) .dot {
  opacity: 0.2;
}

.circle {
  position: fixed;
  display: grid;
  place-items: center;
  top: var(--top);
  left: var(--left);
  right: calc(100vw - var(--right));
  height: calc(var(--right) - var(--left));
  transform: translateY(-50%) scale(1.2);
  background: linear-gradient(to bottom, #f0ebe9, #dcd7d6);
  border-radius: 9999px;
  z-index: -1;
}

.circle span {
  text-transform: uppercase;
  font-size: 5vh;
  margin-top: 30vh;
  color: var(--gray);
}
</style>
