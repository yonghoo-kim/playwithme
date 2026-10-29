import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { kmaBaseTimes, latLonToKmaGrid, summarizeKma } from "@/lib/weather";

const KMA_BASE =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

/**
 * Current weather for a location from 기상청 (nowcast + ultra-short forecast).
 * Query: `?lat=..&lon=..`. Signed-in users only (the API key has a daily
 * quota). Only the 5km grid cell is used, and each KMA response is cached
 * for 10 minutes per grid cell and base time, so everyone nearby shares it.
 * Returns `{ temp: number | null, condition }`.
 */
export async function GET(request: NextRequest) {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const key = process.env.KMA_SERVICE_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "날씨 정보를 사용할 수 없어요." },
      { status: 503 }
    );
  }

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  // KMA only covers the Korean peninsula and nearby seas.
  if (!(lat >= 32 && lat <= 39.5 && lon >= 124 && lon <= 132)) {
    return NextResponse.json(
      { error: "이 위치의 날씨는 볼 수 없어요." },
      { status: 400 }
    );
  }

  const { nx, ny } = latLonToKmaGrid(lat, lon);
  const { ncst, fcst } = kmaBaseTimes(new Date());

  const call = async (op: string, date: string, time: string) => {
    const params = new URLSearchParams({
      serviceKey: key,
      pageNo: "1",
      numOfRows: "100",
      dataType: "JSON",
      base_date: date,
      base_time: time,
      nx: String(nx),
      ny: String(ny),
    });
    const res = await fetch(`${KMA_BASE}/${op}?${params}`, {
      next: { revalidate: 600 },
    });
    const json = await res.json();
    if (json?.response?.header?.resultCode !== "00") {
      throw new Error(`${op}: ${json?.response?.header?.resultMsg ?? res.status}`);
    }
    return json.response.body?.items?.item ?? [];
  };

  try {
    const [ncstItems, fcstItems] = await Promise.all([
      call("getUltraSrtNcst", ncst.date, ncst.time),
      call("getUltraSrtFcst", fcst.date, fcst.time),
    ]);
    return NextResponse.json(summarizeKma(ncstItems, fcstItems), {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    console.error("KMA weather failed:", err);
    return NextResponse.json(
      { error: "날씨를 불러오지 못했어요." },
      { status: 502 }
    );
  }
}
