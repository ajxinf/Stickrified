import { createTikTokStyleCaptions } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Nunito (variable weight 200-1000, SIL OFL 1.1, public/fonts/, credited in assets/CREDITS.md): the caption and stamp
 * face, loaded once at import; every render waits for it (delayRender), so captions never fall back to a system font
 * and the QA guard's caption-width check measures the real glyphs.
 */
if (typeof document !== "undefined") {
  const handle = delayRender("Loading the caption font (Nunito)");
  new FontFace("Nunito", `url(${staticFile("fonts/Nunito-wght.ttf")}) format("truetype")`, { weight: "200 1000" })
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(handle);
    })
    .catch((e) => cancelRender(e));
}

/**
 * Burned-in word captions (SKILL "Captions", LOOK_SPEC identity 3; R13 restyle 2026-11-14): at most 2 words at a time
 * from words.json, all white, bold rounded sans with a thick dark outline and a firm drop shadow, centred at y = 0.70 H,
 * no colour highlight, no pop or bounce: each group appears on its first word and holds until the next. `*key*` marks in
 * the word list are stripped (they still drive the script tools and audio tags).
 */
export type CaptionWord = { text: string; start: number; end: number };

export const CAPTION_FONT = '"Nunito", "Segoe UI Black", "Arial Rounded MT Bold", "Arial Black", sans-serif';
/** Sizes as fractions of the frame width: font, outline, max line width (longer groups wrap; the guard checks). */
// Larger and heavier than v1 (refs: big bold words, thick black outline, firm drop shadow; 2026-11-14 stress test).
export const CAPTION = { size: 0.06, stroke: 0.016, maxWidth: 0.84, maxLines: 2 };

/** Caption groups of at most 2 words, exactly as drawn: shared with the QA guard's "Caption width" check. */
export const captionPages = (words: CaptionWord[]) =>
  createTikTokStyleCaptions({
    captions: words.map((w) => ({ text: ` ${w.text.replace(/\*/g, "")}`, startMs: w.start * 1000, endMs: w.end * 1000, timestampMs: null, confidence: null })),
    combineTokensWithinMilliseconds: 350,
  }).pages.flatMap((p) => {
    const end = p.startMs + p.durationMs, out: typeof p[] = [];
    for (let k = 0; k < p.tokens.length; k += 2) {
      const tokens = p.tokens.slice(k, k + 2), startMs = k === 0 ? p.startMs : tokens[0].fromMs;
      const endMs = k + 2 < p.tokens.length ? p.tokens[k + 2].fromMs : end;
      out.push({ ...p, tokens, startMs, durationMs: endMs - startMs, text: tokens.map((t) => t.text).join("") });
    }
    return out;
  });

export const Captions: React.FC<{ words: CaptionWord[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pages = useMemo(() => captionPages(words), [words]);
  const ms = (frame / fps) * 1000;
  const i = pages.filter((p) => p.startMs <= ms).length - 1; // pages are in time order
  const page = pages[i];
  if (!page || (i === pages.length - 1 && ms > page.startMs + page.durationMs + 300)) return null;
  const size = CAPTION.size * width;
  // Two stacked copies in one grid cell: the outline layer behind (thick stroke, dark fill), the letters on top with
  // no stroke. A stroke drawn over the fill (Chrome ignores paint-order on HTML text) ate thin glyphs: "!" read as
  // "?" in the pilot. Never draw the outline on the letters themselves.
  const text = () => page.tokens.map((t, k) => <span key={k}>{t.text}</span>);
  // Explicit stacking: a layer with a filter paints after unpositioned siblings, so z-index decides, not DOM order.
  const layer: React.CSSProperties = { gridArea: "1 / 1", position: "relative", maxWidth: CAPTION.maxWidth * width, whiteSpace: "normal", textAlign: "center" };
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: "70%",
          transform: "translateY(-50%)",
          display: "grid",
          fontFamily: CAPTION_FONT,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.1,
        }}
      >
        <div aria-hidden style={{ ...layer, zIndex: 0, color: "#141014", WebkitTextStroke: `${CAPTION.stroke * width}px #141014`, filter: `drop-shadow(0 ${0.005 * width}px ${0.002 * width}px rgba(0,0,0,0.75))` }}>
          {text()}
        </div>
        <div style={{ ...layer, zIndex: 1, color: "#ffffff" }}>{text()}</div>
      </div>
    </AbsoluteFill>
  );
};
