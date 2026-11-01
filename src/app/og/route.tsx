import { ImageResponse } from "next/og";

export const runtime = "edge";

const TITLE = "나랑 놀자";
const SUBTITLE = "같이 놀자! 친구들은 지금 어디 있을까?";

// Satori has no Korean glyphs of its own: fetch just the characters we draw
// from Google Fonts (the CSS API returns a TTF for non-browser agents).
async function loadJua(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Jua&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

function Kid({ shirt, hair, skin, left }: { shirt: string; hair: string; skin: string; left: number }) {
  return (
    <div style={{ position: "absolute", left, bottom: 120, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: skin,
          borderTop: `16px solid ${hair}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 8,
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ width: 7, height: 7, borderRadius: 4, background: "#2A1A12" }} />
          <div style={{ width: 7, height: 7, borderRadius: 4, background: "#2A1A12" }} />
        </div>
        <div style={{ width: 16, height: 8, marginTop: 5, borderRadius: "0 0 8px 8px", background: "#E2557A" }} />
      </div>
      <div style={{ width: 52, height: 50, marginTop: 4, borderRadius: 16, background: shirt }} />
      <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
        <div style={{ width: 14, height: 28, borderRadius: 7, background: "#5B6B8C" }} />
        <div style={{ width: 14, height: 28, borderRadius: 7, background: "#5B6B8C" }} />
      </div>
    </div>
  );
}

export async function GET() {
  const font = await loadJua(TITLE + SUBTITLE);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#9DDCFF",
          fontFamily: font ? "Jua" : "sans-serif",
        }}
      >
        <div style={{ position: "absolute", right: 120, top: 60, width: 130, height: 130, borderRadius: 65, background: "#FFD84D" }} />
        <div style={{ position: "absolute", left: 90, top: 90, width: 200, height: 70, borderRadius: 35, background: "white" }} />
        <div style={{ position: "absolute", left: -200, right: -200, bottom: -260, height: 470, borderRadius: "50%", background: "#7BD88F" }} />
        <div style={{ position: "absolute", left: -100, right: -300, bottom: -330, height: 460, borderRadius: "50%", background: "#5BC274" }} />

        <div style={{ position: "absolute", left: 120, bottom: 140, width: 14, height: 190, background: "#F48FB1" }} />
        <div style={{ position: "absolute", left: 170, bottom: 140, width: 14, height: 190, background: "#F48FB1" }} />
        <div style={{ position: "absolute", left: 110, bottom: 320, width: 90, height: 18, borderRadius: 9, background: "#FF7FA8" }} />
        <div style={{ position: "absolute", left: 190, bottom: 305, width: 260, height: 30, borderRadius: 15, background: "#FFC93C", transform: "rotate(38deg)", transformOrigin: "left center" }} />

        <Kid shirt="#FF8FB1" hair="#1A1412" skin="#8D5A3B" left={760} />
        <Kid shirt="#7FC8FF" hair="#E8C25A" skin="#FFE6D5" left={860} />
        <Kid shirt="#FFC93C" hair="#2E2A28" skin="#F3CFA6" left={960} />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 170,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 150, color: "#BE185D", lineHeight: 1 }}>{TITLE}</div>
          <div style={{ fontSize: 44, color: "#1E3A8A", marginTop: 24 }}>{SUBTITLE}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: "Jua", data: font, style: "normal", weight: 400 }] : undefined,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    }
  );
}
