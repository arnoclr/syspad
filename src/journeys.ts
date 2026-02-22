import type { Dayjs } from "dayjs";
import type { SimpleJourney } from "./services/Wagon";

export const extractNextUniqueDepartures = (journeysList: SimpleJourney[]) => {
  const uniqueDepartures = new Map<
    string,
    { terminusId: string; eta: Dayjs }
  >();
  const terminuses = new Set<string>();
  const nextTerminus = journeysList.at(1)?.stops.at(-1)?.id;

  for (const journey of journeysList) {
    const terminusId = journey.stops.at(-1)?.id;
    terminuses.add(terminusId ?? "");
  }

  for (const journey of journeysList) {
    for (const nonTerminusStop of journey.stops.slice(0, -1)) {
      terminuses.delete(nonTerminusStop.id);
    }
  }

  for (const journey of journeysList.slice(1)) {
    const terminusId = journey.stops.at(-1)?.id;

    if (
      terminusId &&
      terminuses.has(terminusId) &&
      nextTerminus !== terminusId &&
      !uniqueDepartures.has(terminusId)
    ) {
      uniqueDepartures.set(terminusId, {
        terminusId,
        eta: journey.userStopDeparture.leavesAt,
      });
    }
  }

  return Array.from(uniqueDepartures.values());
};
