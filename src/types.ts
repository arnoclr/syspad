export type ApplicationParams = {
  currentStopId: string;
  lineId: string;
  terminusPosition: { lat: number; lon: number } | undefined;
  shortTrainMessage?: "right" | "left" | string;
} | null;
