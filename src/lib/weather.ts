// Korea Meteorological Administration (기상청) short-range API helpers:
// lat/lon -> KMA 5km grid, which base times are already published, and a
// summary of the nowcast + ultra-short forecast as one weather condition.

export type WeatherCondition = "clear" | "partly" | "cloudy" | "rain" | "snow";

/** How hard it rains / snows (drives the amount drawn); null when dry. */
export type PrecipLevel = "light" | "moderate" | "heavy";

export interface WeatherSummary {
  /** Rounded °C, or null when the nowcast had no temperature. */
  temp: number | null;
  condition: WeatherCondition;
  level: PrecipLevel | null;
}

// RN1 (1-hour amount, mm) usually arrives as a number string, but KMA also
// uses text like "강수없음" or "1mm 미만" / "50.0mm 이상".
function hourlyAmount(raw: string | undefined): number {
  const value = parseFloat(raw ?? "");
  if (!Number.isFinite(value)) return 0;
  return raw?.includes("미만") ? value / 2 : value;
}

/** Lambert conformal conic projection used by KMA (기상청 격자, 5km). */
export function latLonToKmaGrid(lat: number, lon: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const D = Math.PI / 180;
  const re = RE / GRID;
  const slat1 = SLAT1 * D;
  const slat2 = SLAT2 * D;
  const olon = OLON * D;
  const olat = OLAT * D;

  const sn =
    Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(
      Math.tan(Math.PI / 4 + slat2 / 2) / Math.tan(Math.PI / 4 + slat1 / 2)
    );
  const sf = (Math.tan(Math.PI / 4 + slat1 / 2) ** sn * Math.cos(slat1)) / sn;
  const ro = (re * sf) / Math.tan(Math.PI / 4 + olat / 2) ** sn;
  const ra = (re * sf) / Math.tan(Math.PI / 4 + lat * D / 2) ** sn;

  let theta = lon * D - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

interface BaseTime {
  date: string;
  time: string;
}

// Hour `hoursBack` before `kst` (a Date shifted to KST, read with UTC getters).
function kstHour(kst: Date, hoursBack: number): { date: string; hh: string } {
  const t = new Date(kst.getTime() - hoursBack * 3600_000);
  return {
    date: t.toISOString().slice(0, 10).replace(/-/g, ""),
    hh: String(t.getUTCHours()).padStart(2, "0"),
  };
}

/**
 * Latest published base times: the nowcast (초단기실황, HH00) is out at
 * about HH:40 and the ultra-short forecast (초단기예보, HH30) at about HH:45.
 */
export function kmaBaseTimes(now: Date): { ncst: BaseTime; fcst: BaseTime } {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const minute = kst.getUTCMinutes();
  const n = kstHour(kst, minute < 40 ? 1 : 0);
  const f = kstHour(kst, minute < 45 ? 1 : 0);
  return {
    ncst: { date: n.date, time: `${n.hh}00` },
    fcst: { date: f.date, time: `${f.hh}30` },
  };
}

interface NcstItem {
  category: string;
  obsrValue: string;
}

interface FcstItem {
  category: string;
  fcstTime: string;
  fcstValue: string;
}

/**
 * Rain/snow comes from the nowcast's precipitation type (PTY: 1 비, 2 비/눈,
 * 3 눈, 5 빗방울, 6 빗방울눈날림, 7 눈날림); otherwise the sky (SKY: 1 맑음,
 * 3 구름많음, 4 흐림) from the nearest forecast hour.
 */
export function summarizeKma(ncst: NcstItem[], fcst: FcstItem[]): WeatherSummary {
  const value = (category: string) =>
    ncst.find((item) => item.category === category)?.obsrValue;

  const rawTemp = Number(value("T1H"));
  const temp = value("T1H") !== undefined && Number.isFinite(rawTemp)
    ? Math.round(rawTemp)
    : null;

  const pty = value("PTY");
  const amount = hourlyAmount(value("RN1"));
  if (pty === "3" || pty === "7") {
    // 눈날림 (7) is always light; otherwise 1mm+ of water is 함박눈.
    const level = pty === "3" && amount >= 1 ? "heavy" : "light";
    return { temp, condition: "snow", level };
  }
  if (pty === "1" || pty === "2" || pty === "5" || pty === "6") {
    // KMA wording: 약한 비 <3mm, 보통 비 3-15mm, 강한 비 15mm+.
    // 빗방울 (5, 6) is always light.
    const drizzle = pty === "5" || pty === "6";
    const level: PrecipLevel =
      drizzle || amount < 3 ? "light" : amount < 15 ? "moderate" : "heavy";
    return { temp, condition: "rain", level };
  }

  const skies = fcst.filter((item) => item.category === "SKY");
  const nearest = skies.length > 0 ? skies[0] : undefined;
  const condition: WeatherCondition =
    nearest?.fcstValue === "4"
      ? "cloudy"
      : nearest?.fcstValue === "3"
        ? "partly"
        : "clear";
  return { temp, condition, level: null };
}
