import dayjs, { Dayjs } from "dayjs";
import { onMounted, onUnmounted, ref, type Ref } from "vue";
import { nextTrainJourneys } from "../fetch";
import type { SimpleJourney } from "../services/Wagon";
import type { ApplicationParams } from "../types";
import { useDocumentVisibility } from "@vueuse/core";

export function useJourneys(params: Ref<ApplicationParams>) {
  let interval: number | null = null;
  const lastUpdate = ref(dayjs());
  const nextDepartureIsInPast = ref(true);
  const journeys = ref<SimpleJourney[] | null>(null);
  const nextOptimizedRefreshDate = ref(dayjs());
  const visibility = useDocumentVisibility();

  async function updateJourneys() {
    if (params.value === null) return false;
    if (visibility.value !== "visible") return false;

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

    return true;
  }

  function getNextOptimizedRefreshDate(nextDepartureLeavesAt: Dayjs) {
    const secondsUntilDeparture = nextDepartureLeavesAt.diff(dayjs(), "second");

    if (secondsUntilDeparture <= 10) {
      return dayjs().add(10, "second");
    } else if (secondsUntilDeparture <= 60) {
      return nextDepartureLeavesAt;
    } else if (secondsUntilDeparture <= 5 * 60) {
      return dayjs().add(1, "minute");
    } else {
      return dayjs().add(2, "minutes");
    }
  }

  async function tryUpdateJourneys() {
    if (params.value === null) return;
    if (visibility.value !== "visible") return;

    if (dayjs().isAfter(nextOptimizedRefreshDate.value)) {
      const updated = await updateJourneys();
      const nextDepartureLeavesAt =
        journeys.value?.at(0)?.userStopDeparture.leavesAt;
      if (updated && nextDepartureLeavesAt) {
        nextOptimizedRefreshDate.value = getNextOptimizedRefreshDate(
          nextDepartureLeavesAt,
        );
        console.log(
          `next refresh in ${nextOptimizedRefreshDate.value.diff(dayjs(), "second")} seconds`,
        );
      } else {
        nextOptimizedRefreshDate.value = dayjs().add(1, "minute");
      }
    }
  }

  onMounted(() => {
    updateJourneys();

    interval = setInterval(() => {
      tryUpdateJourneys();
    }, 5000);
  });

  onUnmounted(() => {
    if (interval) {
      clearInterval(interval);
    }
  });

  return { journeys, nextDepartureIsInPast };
}
