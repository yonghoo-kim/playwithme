// One-line nudge under the child pills on rainy / snowy days. Shown purely
// from <html data-weather> (set by WeatherChip), so it needs no state.
export default function WeatherHint() {
  const line =
    "hidden items-center justify-center gap-1 rounded-full border-2 px-3 py-1 text-sm font-bold";
  return (
    <>
      <p
        className={`${line} border-blue-300 bg-blue-50/90 text-blue-900 [html[data-weather=rain]_&]:flex`}
      >
        ☔ 비 와요 · 실내 놀이 어때요?
      </p>
      <p
        className={`${line} border-sky-200 bg-white/90 text-blue-900 [html[data-weather=snow]_&]:flex`}
      >
        ⛄ 눈 와요 · 따뜻하게 입혀요
      </p>
    </>
  );
}
