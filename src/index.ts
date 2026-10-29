/**
 * @bitbaum/chartkit — the arithmetic behind every chart, as pure functions.
 *
 * Nothing here touches the DOM. Where a point sits (in per cent of the plot),
 * which round numbers the axis names, which month ticks a timeline gets,
 * which lane an event goes in when two collide, how a label is shortened:
 * each is a function of the data alone, so it runs on the server, is tested
 * with `node --test`, and draws the same at 320px and at 1440px because the
 * browser only stretches what was computed once.
 */

/** An x value: an ISO period (YYYY, YYYY-MM, YYYY-MM-DD, YYYY-Qn) or a number. */
export type XValue = string | number;

export interface LinePoint {
  x: XValue;
  y: number;
  /** The page the number came from. Every point is a link when it has one. */
  href?: string;
  note?: string;
  /** The publisher marks the value preliminary. */
  preliminary?: boolean;
}

export interface LineSeries {
  id: string;
  label: string;
  points: LinePoint[];
}

export interface Placed {
  /** 0–100 from the left. */
  x: number;
  /** 0–100 from the top. */
  y: number;
}

export interface Tick {
  /** 0–100 along the axis. */
  pos: number;
  label: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Where an x value sits on the axis, as a number. A date is placed in UTC
 * ms: a year mid-year and a quarter mid-quarter — a position for drawing,
 * not a claim about the value. A number is itself. Unreadable → NaN.
 */
export function xPosition(x: XValue): number {
  if (typeof x === "number") return x;
  const q = x.match(/^(\d{4})-Q([1-4])$/);
  if (q) return Date.UTC(Number(q[1]), (Number(q[2]) - 1) * 3 + 1, 15);
  const m = x.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!m) return NaN;
  if (!m[2]) return Date.UTC(Number(m[1]), 6, 1);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 15);
}

/** Whether an x value is a period rather than a number. */
export function isDate(x: XValue): boolean {
  return typeof x === "string";
}

/** "2025", "Q2 2025", "Aug 2026", "3 Mar 2026"; a number as a number. */
export function formatX(x: XValue, locale?: string): string {
  if (typeof x === "number") return formatNumber(x, locale);
  const q = x.match(/^(\d{4})-Q([1-4])$/);
  if (q) return `Q${q[2]} ${q[1]}`;
  const m = x.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!m) return x;
  if (!m[2]) return m[1];
  if (locale)
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      ...(m[3] ? { day: "numeric" as const } : {}),
      timeZone: "UTC",
    }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 1)));
  const month = MONTHS[Number(m[2]) - 1];
  return m[3] ? `${Number(m[3])} ${month} ${m[1]}` : `${month} ${m[1]}`;
}

/** Values as the source gave them, grouped for reading; never rounded past three decimals. */
export function formatNumber(value: number, locale = "en"): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 3 });
}

/** A step of 1, 2 or 5 × 10ⁿ that splits the span into about `count` parts. */
export function niceStep(span: number, count: number): number {
  if (!(span > 0)) return 1;
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

export interface Scale {
  min: number;
  max: number;
  ticks: number[];
}

/**
 * A value axis on round numbers. `from: "zero"` starts at zero; `"data"` at
 * the rounded floor of the data; `"auto"` (the default) starts at zero when
 * the data sits near it, so a small value is not drawn as a large one.
 */
export function valueScale(
  values: readonly number[],
  from: "zero" | "data" | "auto" = "auto",
  tickCount = 3,
): Scale {
  const finite = values.filter((v) => Number.isFinite(v));
  let lo = finite.length ? Math.min(...finite) : 0;
  let hi = finite.length ? Math.max(...finite) : 1;
  if (from === "zero") lo = Math.min(lo, 0);
  if (lo === hi) {
    // One value, or a flat line: give it room rather than dividing by zero.
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep(hi - lo, tickCount);
  const nearZero = lo >= 0 && lo < (hi - lo) * 0.5;
  const min =
    from === "zero" || (from === "auto" && nearZero)
      ? Math.min(0, lo)
      : Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { min, max, ticks };
}

/** Per cent from the top for a value on a scale. */
export function yPercent(value: number, scale: Scale): number {
  return scale.max === scale.min ? 50 : ((scale.max - value) / (scale.max - scale.min)) * 100;
}

/** The x extent of several series, as positions. */
export function xExtent(series: readonly { points: readonly { x: XValue }[] }[]): [number, number] {
  const xs = series.flatMap((s) => s.points.map((p) => xPosition(p.x))).filter(Number.isFinite);
  if (xs.length === 0) return [0, 1];
  return [Math.min(...xs), Math.max(...xs)];
}

/** Per cent from the left for an x value on an extent. */
export function xPercent(x: XValue, [x0, x1]: [number, number]): number {
  const v = xPosition(x);
  return x1 === x0 ? 50 : ((v - x0) / (x1 - x0)) * 100;
}

/** SVG path data through placed points, in a 0–100 box. */
export function linePath(placed: readonly Placed[]): string {
  return placed
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

/**
 * The region under a line, closed down to the plot's floor (100 in the
 * 0–100 box): a light fill that says "this is the level", the way a quote
 * page draws a price. Empty for fewer than two points.
 */
export function areaPath(placed: readonly Placed[]): string {
  if (placed.length < 2) return "";
  const first = placed[0];
  const last = placed[placed.length - 1];
  return `${linePath(placed)} L${last.x.toFixed(2)} 100 L${first.x.toFixed(2)} 100 Z`;
}

/** How a LineChart marks its values. */
export type LineMarkers = "auto" | "none" | "ends" | "all";

/**
 * Above this many points on a series, `markers="auto"` draws no dots: 250
 * daily closes drawn as 250 beads is a string of pearls, not a price line.
 */
export const AUTO_MARKER_LIMIT = 60;

/** `auto` settled against the longest series: `all` up to the limit, `none` above. */
export function resolveMarkers(
  markers: LineMarkers,
  longest: number,
): Exclude<LineMarkers, "auto"> {
  if (markers !== "auto") return markers;
  return longest > AUTO_MARKER_LIMIT ? "none" : "all";
}

/**
 * The strip of the plot each point answers for when its dot is hidden: from
 * half way to the previous point to half way to the next, in per cent of the
 * plot's width. The strips tile the plot with no gap, so a pointer or a finger
 * anywhere over the line lands on the nearest value, however dense the data.
 */
export function hitColumns(placed: readonly Placed[]): { left: number; width: number }[] {
  return placed.map((p, i) => {
    const prev = i > 0 ? (placed[i - 1].x + p.x) / 2 : 0;
    const next = i < placed.length - 1 ? (p.x + placed[i + 1].x) / 2 : 100;
    const left = Math.min(prev, p.x);
    return { left, width: Math.max(0, Math.max(next, p.x) - left) };
  });
}

/**
 * The steps a time axis may tick on, finest first: days, weeks (from a
 * Monday), months, years. Each names its unit and how many of it.
 */
const TIME_STEPS: readonly (readonly ["day" | "week" | "month" | "year", number])[] = [
  ["day", 1],
  ["day", 2],
  ["week", 1],
  ["week", 2],
  ["month", 1],
  ["month", 2],
  ["month", 3],
  ["month", 6],
  ["year", 1],
  ["year", 2],
  ["year", 5],
  ["year", 10],
  ["year", 20],
  ["year", 25],
  ["year", 50],
  ["year", 100],
];

const DAY = 86_400_000;
/** 1970-01-05 was a Monday: weeks are counted from it. */
const MONDAY = 4 * DAY;

/** The instants a step ticks on between two instants, or null when there would be far too many. */
function stepInstants(
  x0: number,
  x1: number,
  unit: "day" | "week" | "month" | "year",
  n: number,
  limit: number,
): number[] | null {
  const out: number[] = [];
  if (unit === "day" || unit === "week") {
    const size = (unit === "day" ? 1 : 7) * n * DAY;
    if ((x1 - x0) / size > limit * 4) return null;
    const origin = unit === "day" ? 0 : MONDAY;
    for (let t = origin + Math.ceil((x0 - origin) / size) * size; t <= x1; t += size) out.push(t);
    return out;
  }
  const d0 = new Date(x0);
  if (unit === "month") {
    if ((x1 - x0) / (n * 28 * DAY) > limit * 4) return null;
    let y = d0.getUTCFullYear();
    let m = d0.getUTCMonth();
    for (;;) {
      const t = Date.UTC(y, m, 1);
      if (t > x1) break;
      if (t >= x0 && m % n === 0) out.push(t);
      if (++m > 11) {
        m = 0;
        y++;
      }
    }
    return out;
  }
  if ((x1 - x0) / (n * 365 * DAY) > limit * 4) return null;
  for (let y = d0.getUTCFullYear(); ; y++) {
    const t = Date.UTC(y, 0, 1);
    if (t > x1) break;
    if (t >= x0 && y % n === 0) out.push(t);
  }
  return out;
}

/**
 * Ticks along a time axis, at most `count` of them, for any span: days for
 * a week of data, weeks for a month, months for a year, years for decades.
 * Of the steps that give between three and `count` ticks the coarsest wins
 * (a quarter-year of months, not of fortnights); with none, the finest that
 * fits. The first label, and the first in each new year, name the year. An
 * axis is never left empty: a span no step ticks inside is labelled at its
 * two ends.
 */
export function timeTicks(x0: number, x1: number, count = 5, locale?: string): Tick[] {
  if (!(x1 > x0)) return [{ pos: 50, label: formatMs(x0, "month", locale) }];
  const span = x1 - x0;
  const pos = (t: number) => ((t - x0) / span) * 100;
  const fitting: { unit: (typeof TIME_STEPS)[number][0]; at: number[] }[] = [];
  for (const [unit, n] of TIME_STEPS) {
    const at = stepInstants(x0, x1, unit, n, count);
    if (at && at.length > 0 && at.length <= count) fitting.push({ unit, at });
  }
  const pick =
    fitting.filter((f) => f.at.length >= Math.min(3, count)).at(-1) ??
    fitting.find((f) => f.at.length >= 2) ??
    fitting[0];
  if (!pick) {
    // Under a day, or between two ticks of every step: name the two ends.
    const a = dayLabel(x0, true, locale);
    const b = dayLabel(x1, true, locale);
    return a === b
      ? [{ pos: 50, label: a }]
      : [
          { pos: 0, label: a },
          { pos: 100, label: b },
        ];
  }
  let year = NaN;
  return pick.at.map((t) => {
    const d = new Date(t);
    const newYear = d.getUTCFullYear() !== year;
    year = d.getUTCFullYear();
    const label =
      pick.unit === "year"
        ? String(year)
        : pick.unit === "month"
          ? monthLabel(t, newYear, locale)
          : dayLabel(t, newYear, locale);
    return { pos: pos(t), label };
  });
}

/** "5 Oct", or "5 Oct 2026" with the year; in a locale, its own short form. */
function dayLabel(t: number, year: boolean, locale?: string): string {
  const d = new Date(t);
  return locale
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        ...(year ? { year: "numeric" as const } : {}),
        timeZone: "UTC",
      }).format(d)
    : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}`;
}

function monthLabel(t: number, year: boolean, locale?: string): string {
  const d = new Date(t);
  return locale
    ? new Intl.DateTimeFormat(locale, {
        month: "short",
        ...(year ? { year: "numeric" as const } : {}),
        timeZone: "UTC",
      }).format(d)
    : `${MONTHS[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}`;
}

function formatMs(t: number, unit: "year" | "month", locale?: string): string {
  const d = new Date(t);
  return unit === "year" ? String(d.getUTCFullYear()) : monthLabel(t, true, locale);
}

/** Ticks for a numeric axis on round numbers. */
export function numberTicks(x0: number, x1: number, count = 5, locale?: string): Tick[] {
  const scale = valueScale([x0, x1], "data", count);
  const ticks = scale.ticks
    .filter((v) => v >= x0 && v <= x1)
    .map((v) => ({ pos: ((v - x0) / (x1 - x0 || 1)) * 100, label: formatNumber(v, locale) }));
  // One value, or a span no round number falls in: name it rather than leave the axis bare.
  return ticks.length ? ticks : [{ pos: x1 > x0 ? 0 : 50, label: formatNumber(x0, locale) }];
}

/**
 * Shorten a label to `max` characters with an ellipsis, cutting at a word
 * where one falls in the last third. The full text travels in `title`.
 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max - 1);
  const space = head.lastIndexOf(" ");
  return `${space > (max * 2) / 3 ? head.slice(0, space) : head}…`;
}

/**
 * A lane per item so that no two spans in one lane overlap or come closer
 * than `gap`. A span is what an item occupies along the axis — a dot and
 * its label, whichever way the label faces. Items are taken in order of
 * their start; each goes in the first lane with room, so lanes are as few
 * as the spans allow and never fewer than the collisions demand.
 */
export function lanes(spans: readonly (readonly [number, number])[], gap = 0): number[] {
  const order = spans.map((s, i) => [s, i] as const).sort((a, b) => a[0][0] - b[0][0]);
  const taken: [number, number][][] = [];
  const lane = new Array<number>(spans.length).fill(0);
  for (const [[start, end], i] of order) {
    let l = taken.findIndex((spans) => spans.every(([a, b]) => end + gap <= a || start >= b + gap));
    if (l < 0) {
      l = taken.length;
      taken.push([]);
    }
    taken[l].push([start, end]);
    lane[i] = l;
  }
  return lane;
}

export interface MonthTick extends Tick {
  /** Carries a label; the rest are marks between labels. */
  major: boolean;
}

/**
 * A mark at every month start between two instants, with a label on every
 * `step`-th so that at most `count` are labelled. A labelled January, and
 * the first label, name the year.
 */
export function monthTicks(x0: number, x1: number, count = 6, locale?: string): MonthTick[] {
  if (!(x1 > x0)) return [];
  const d0 = new Date(x0);
  let y = d0.getUTCFullYear();
  let m = d0.getUTCMonth();
  const starts: number[] = [];
  for (;;) {
    const t = Date.UTC(y, m, 1);
    if (t > x1) break;
    if (t >= x0) starts.push(t);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  const step = Math.max(1, Math.ceil(starts.length / count));
  let labelled = 0;
  return starts.map((t, i) => {
    const major = i % step === 0;
    const d = new Date(t);
    const label = major ? monthLabel(t, d.getUTCMonth() === 0 || labelled++ === 0, locale) : "";
    return { pos: ((t - x0) / (x1 - x0)) * 100, label, major };
  });
}

/** A share as "53%"; under one per cent, "<1%". */
export function formatShare(share: number): string {
  const pct = share * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1).replace(/\.0$/, "")}%`;
}

/** The plot widths, in CSS px, at which a ColumnChart re-plans its period labels. */
export const COLUMN_AXIS_WIDTHS: readonly number[] = [
  0, 160, 200, 240, 280, 320, 360, 400, 480, 560, 640, 720, 800, 880, 960, 1080, 1200,
];

/** The label size (0.75rem), the axis's column gap (0.5rem) and the least room between two labels. */
const LABEL_PX = 12;
const COLUMN_GAP_PX = 8;
const LABEL_PAD_PX = 6;
const WIDE =
  /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]|\p{Extended_Pictographic}/u;

/**
 * How wide a label is in the monospace label face, in CSS px, without a
 * browser: 0.61em a character (every common monospace is 0.6), a full em
 * for a wide (CJK) character or a pictograph. Generous on purpose: a label
 * thought wider than it is costs a hidden neighbour; one thought narrower
 * prints over it.
 */
export function labelWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += WIDE.test(ch) ? 1 : 0.61;
  return em * LABEL_PX;
}

/**
 * Every how-many-th period label a row of columns can carry at a plot width:
 * 1 when each fits its column, else the least step at which the labels shown
 * (the first, then every step-th) neither touch nor leave the plot. A label
 * wider than its column is centred on it and runs over its hidden
 * neighbours; the first is held at the left edge and the last at the right.
 * When not even one label fits beside another, only the first is shown.
 */
export function columnLabelStep(labels: readonly string[], plotWidth: number): number {
  const n = labels.length;
  if (n <= 1) return 1;
  const pitch = (plotWidth + COLUMN_GAP_PX) / n;
  const col = Math.max(0, pitch - COLUMN_GAP_PX);
  const widths = labels.map(labelWidth);
  const fits = (step: number) => {
    let previous = -Infinity;
    for (let i = 0; i < n; i += step) {
      const w = widths[i];
      const centre = i * pitch + col / 2;
      let left = centre - w / 2;
      if (w > col && i === 0) left = 0;
      else if (w > col && i === n - 1) left = plotWidth - w;
      if (left < -0.5 || left + w > plotWidth + 0.5) return false;
      if (left < previous + LABEL_PAD_PX) return false;
      previous = left + w;
    }
    return true;
  };
  for (let step = 1; step < n; step++) if (fits(step)) return step;
  return n;
}

/**
 * For each period label of a ColumnChart, the widths of
 * `COLUMN_AXIS_WIDTHS` at which it steps back so its neighbours fit — the
 * step is planned for the narrowest plot of each band, so it holds across
 * the band. A label is thinned out, never cut: the CSS hides it with a
 * container query on the axis. Empty for a label shown at every width.
 */
export function columnLabelPlan(labels: readonly string[]): number[][] {
  const hidden: number[][] = labels.map(() => []);
  for (const width of COLUMN_AXIS_WIDTHS) {
    const step = columnLabelStep(labels, Math.max(width, 100));
    if (step === 1) continue;
    labels.forEach((_, i) => {
      if (i % step !== 0) hidden[i].push(width);
    });
  }
  return hidden;
}
