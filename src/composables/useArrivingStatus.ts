import { onMounted, onUnmounted, ref, type Ref } from "vue";
import type { SimpleDeparture } from "../services/Wagon";
import dayjs from "dayjs";

export function useArrivingStatus(departure: Ref<SimpleDeparture | undefined>) {
  let intervalId: number | null = null;
  const status = ref<"farAway" | "approaching" | "atPlatform">("farAway");
  const remainingMinutes = ref(-1);

  function updateStatus() {
    if (departure.value?.arrivesAt.isBefore(dayjs())) {
      status.value = "atPlatform";
    } else if (remainingMinutes.value <= 0) {
      status.value = "approaching";
    } else {
      status.value = "farAway";
    }
  }

  function updateRemainingMinutes() {
    const now = dayjs();
    const diff = departure.value?.arrivesAt.diff(now, "minute", true);
    remainingMinutes.value = diff !== undefined ? Math.ceil(diff) : -1;
  }

  onMounted(() => {
    updateStatus();
    updateRemainingMinutes();
    intervalId = window.setInterval(() => {
      updateStatus();
      updateRemainingMinutes();
    }, 1000);
  });

  onUnmounted(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  });

  return { status, remainingMinutes };
}
