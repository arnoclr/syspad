import dayjs, { Dayjs } from "dayjs";
import type { Point } from "../geo";

export interface SimpleLine {
  id: string;
  number: string;
  backgroundColor: string;
  textColor: string;
  pictoSvg?: string;
  numberShapeSvg?: string;
  importance: number;
}

export interface SimpleStop {
  id: string;
  name: string;
  position: Position;
  lines: SimpleLine[];
}

export interface Position {
  lat: number;
  long: number;
}

export interface SimpleDeparture {
  destination: {
    name: string;
    averagePosition: Position;
  };
  leavesAt: Dayjs;
  arrivesAt: Dayjs;
  id: string;
  branchHash?: string;
  journeyCode?: string;
  vehicleLength?: "SHORT" | "LONG";
}

export type SimpleJourney = {
  id: string;
  line: SimpleLine;
  userStopDeparture: SimpleDeparture;
  stops: SimpleStop[];
  closedStops: Set<string>;
  skippedStops: Set<string>;
};

function processSVG(svg: string): string {
  return svg
    .replace(/width="[^"]+"/, "")
    .replace(/height="[^"]+"/, `height="100%"`)
    .replace('font-family="', 'font-weight="bold" font-family="Parisine, ');
}

export class Wagon {
  private static BASE_URL = "http://localhost:8787/gantry/";

  private static get baseUrl(): string {
    return Wagon.BASE_URL;
  }

  private static get apiKey(): string {
    return "spad";
  }

  private static positionFromDTO(positionDto: any): Position {
    return {
      lat: positionDto[0],
      long: positionDto[1],
    };
  }

  private static stopFromDTO(stopDto: any, lines: SimpleLine[]): SimpleStop {
    const linesIds = Array.from(
      new Set(
        stopDto.stops
          .map((stop: any) => stop.lines.map((line: any) => line))
          .flat()
      )
    );
    return {
      id: stopDto.id,
      name: stopDto.name,
      position: this.positionFromDTO(stopDto.averagePosition),
      lines: lines.filter((line) => linesIds.includes(line.id)),
    };
  }

  private static lineFromDTO(lineDto: any): SimpleLine {
    return {
      id: lineDto.id,
      number: lineDto.number,
      backgroundColor: lineDto.backgroundColor,
      textColor: lineDto.textColor,
      pictoSvg: processSVG(lineDto.modeSvg ?? ""),
      numberShapeSvg: processSVG(lineDto.numberShapeSvg ?? ""),
      importance: lineDto.importance,
    };
  }

  public static async departures(
    lineId: string,
    stopIds: string[],
    region: Point,
    /** @deprecated */
    isTerminus: boolean = false
  ): Promise<SimpleDeparture[]> {
    let params = new URLSearchParams();

    params.append("action", "departures");
    params.append("coordinates", `${region.lat},${region.lon}`);
    params.append("line", lineId);
    params.append(
      "stops",
      "[" + stopIds.map((id) => `"${id}"`).join(",") + "]"
    );
    params.append("isTerminus", isTerminus ? "1" : "0");
    params.append("compatibilityDate", "2025-01-21");
    params.append("apiKey", this.apiKey);

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch departures");
    }

    const json = await response.json();

    return json.data.departures
      .map((departure: any) => {
        return {
          destination: {
            name: departure.destinationLabel,
            averagePosition: this.positionFromDTO(
              departure.destination.averagePosition
            ),
          },
          leavesAt: dayjs(
            departure.departure?.realTime ||
              departure.departure?.theoretical ||
              "invalid"
          ),
          arrivesAt: dayjs(
            departure.arrival?.realTime ||
              departure.arrival?.theoretical ||
              "invalid"
          ),
          id: departure.journeyId,
          branchHash: departure.branchHash,
          journeyCode: departure.journeyCode,
          vehicleLength: departure.vehicleLength,
        };
      })
      .filter(
        (departure: SimpleDeparture) =>
          departure.leavesAt.isValid() && departure.leavesAt.isAfter(dayjs())
      );
  }

  public static async journey(
    journeyId: string,
    region: Point
  ): Promise<{
    id: string;
    stops: SimpleStop[];
    line: SimpleLine;
    closedStops: Set<string>;
    skippedStops: Set<string>;
  }> {
    let params = new URLSearchParams();

    params.append("action", "journey");
    params.append("coordinates", `${region.lat},${region.lon}`);
    params.append("journeyId", journeyId);
    params.append("compatibilityDate", "2025-01-21");
    params.append("apiKey", this.apiKey);

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch journey");
    }

    const json = await response.json();

    const stops = json.data.stops.map((stop: any) => {
      return this.stopFromDTO(stop.stop, []);
    });

    const line = this.lineFromDTO(json.data.line);

    return {
      id: journeyId,
      stops,
      line,
      closedStops: new Set(
        json.data.stops
          .filter((x: any) => x.isClosed)
          .map((x: any) => x.stop.id)
      ),
      skippedStops: new Set(
        json.data.stops
          .filter((x: any) => x.isSkipped)
          .map((x: any) => x.stop.id)
      ),
    };
  }
}
