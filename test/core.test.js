// The arithmetic every chart shares. Each case is a way a chart has lied or
// collided somewhere: a flat line dividing by zero, a small value drawn as
// a large one, two events printed over each other, a label cut mid-word.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_MARKER_LIMIT,
  COLUMN_AXIS_WIDTHS,
  areaPath,
  columnLabelPlan,
  columnLabelStep,
  labelWidth,
  formatShare,
  hitColumns,
  formatX,
  lanes,
  linePath,
  monthTicks,
  niceStep,
  numberTicks,
  resolveMarkers,
  timeTicks,
  truncate,
  valueScale,
  xExtent,
  xPercent,
  xPosition,
  yPercent,
} from "../dist/index.js";

test("periods are placed mid-period and read as a person writes them", () => {
  assert.equal(xPosition("2025"), Date.UTC(2025, 6, 1));
  assert.equal(xPosition("2025-Q2"), Date.UTC(2025, 4, 15));
  assert.equal(xPosition("2025-03"), Date.UTC(2025, 2, 15));
  assert.equal(xPosition("2025-03-31"), Date.UTC(2025, 2, 31));
  assert.equal(xPosition(7), 7);
  assert.ok(Number.isNaN(xPosition("soon")));
  assert.equal(formatX("2025"), "2025");
  assert.equal(formatX("2025-Q2"), "Q2 2025");
  assert.equal(formatX("2025-03"), "Mar 2025");
  assert.equal(formatX("2025-03-31"), "31 Mar 2025");
  assert.equal(formatX(1600000), "1,600,000");
});

test("the value axis is on round numbers, starts at zero only when the data is near it, and never divides by zero", () => {
  assert.equal(niceStep(100, 3), 50);
  assert.equal(niceStep(7, 3), 5);
  const near = valueScale([3, 48, 20]);
  assert.equal(near.min, 0);
  assert.equal(near.max, 60);
  assert.deepEqual(near.ticks, [0, 20, 40, 60]);
  const far = valueScale([128, 131, 126]);
  assert.equal(far.min, 126, "a lead time of 126–131 weeks is not drawn from zero");
  assert.equal(valueScale([128, 131, 126], "zero").min, 0);
  assert.equal(valueScale([3, 48], "data").min, 0, "the floor of 3 rounds to 0 on a step of 20");
  const flat = valueScale([3, 3, 3]);
  assert.ok(flat.max > flat.min);
  assert.equal(yPercent(60, near), 0);
  assert.equal(yPercent(0, near), 100);
});

test("x positions span the extent; a single point sits in the middle", () => {
  const extent = xExtent([{ points: [{ x: "2025-03-31" }, { x: "2026-06-30" }] }]);
  assert.equal(xPercent("2025-03-31", extent), 0);
  assert.equal(xPercent("2026-06-30", extent), 100);
  assert.equal(xPercent("2025", [5, 5]), 50);
  assert.equal(
    linePath([
      { x: 0, y: 100 },
      { x: 50.123, y: 2 },
    ]),
    "M0.00 100.00 L50.12 2.00",
  );
});

test("time ticks name years over a long span and months over a short one, never more than asked", () => {
  const years = timeTicks(Date.UTC(2015, 0, 1), Date.UTC(2026, 6, 1), 5);
  assert.ok(years.length <= 5 && years.length >= 2, `${years.length} year ticks`);
  assert.ok(years.every((t) => /^\d{4}$/.test(t.label)));
  const months = timeTicks(Date.UTC(2025, 2, 31), Date.UTC(2026, 5, 30), 5);
  assert.ok(months.length <= 5 && months.length >= 3, `${months.length} month ticks`);
  assert.match(months[0].label, /^[A-Z][a-z]{2} \d{4}$/, "the first month names its year");
  assert.ok(months.every((t) => t.pos >= 0 && t.pos <= 100));
  const numbers = numberTicks(0, 1000, 5);
  assert.deepEqual(
    numbers.map((t) => t.label),
    ["0", "200", "400", "600", "800", "1,000"],
  );
});

test("month ticks mark every month and label at most six, naming the year at January and first", () => {
  const ticks = monthTicks(Date.UTC(2025, 11, 1), Date.UTC(2026, 9, 1));
  assert.equal(ticks.length, 11, "December to October, the first month included");
  const labelled = ticks.filter((t) => t.label);
  assert.ok(labelled.length <= 6 && labelled.length >= 4, `${labelled.length} labelled`);
  assert.equal(labelled[0].label, "Dec 2025");
  assert.ok(labelled.some((t) => t.label === "Jan 2026" || t.label === "Feb"));
  assert.ok(ticks.every((t) => t.pos >= 0 && t.pos <= 100));
  assert.deepEqual(monthTicks(5, 5), []);
});

test("events whose spans would touch take separate lanes; the rest share the first", () => {
  const span = (p, w = 22) => [p, p + w];
  assert.deepEqual(lanes([span(0), span(50), span(100)]), [0, 0, 0]);
  assert.deepEqual(lanes([span(0), span(10), span(20), span(50)]), [0, 1, 2, 0]);
  // Out-of-order input is laned by position, not by index.
  assert.deepEqual(lanes([span(50), span(0), span(10)]), [0, 0, 1]);
  // A label facing left reaches back over the one before it.
  assert.deepEqual(
    lanes([
      [40, 70],
      [50, 80],
    ]),
    [0, 1],
  );
  assert.deepEqual(
    lanes(
      [
        [0, 10],
        [10, 20],
      ],
      1,
    ),
    [0, 1],
    "the gap keeps touching spans apart",
  );
});

test("a label is shortened at a word with an ellipsis and never cut mid-word when a word is near", () => {
  assert.equal(truncate("Short", 10), "Short");
  assert.equal(truncate("Taiwan Semiconductor Manufacturing Company", 22), "Taiwan Semiconductor…");
  assert.equal(truncate("Supercalifragilistic", 10), "Supercali…");
  assert.equal(
    truncate("a b cdefghijklmnop", 12),
    "a b cdefghi…",
    "no word in the last third: cut flat",
  );
});

test("shares read as a person says them", () => {
  assert.equal(formatShare(0.99), "99%");
  assert.equal(formatShare(0.0067), "<1%");
  assert.equal(formatShare(0.053), "5.3%");
  assert.equal(formatShare(0), "0%");
});

test("an area closes the line down to the floor; nothing for one point", () => {
  const placed = [
    { x: 0, y: 40 },
    { x: 50, y: 20 },
    { x: 100, y: 60 },
  ];
  assert.equal(areaPath(placed), `${linePath(placed)} L100.00 100 L0.00 100 Z`);
  assert.equal(areaPath(placed.slice(0, 1)), "");
});

test("markers: auto draws dots up to the limit and none above it; the rest are what they say", () => {
  assert.equal(AUTO_MARKER_LIMIT, 60);
  assert.equal(resolveMarkers("auto", 60), "all");
  assert.equal(resolveMarkers("auto", 61), "none");
  assert.equal(resolveMarkers("auto", 250), "none");
  assert.equal(resolveMarkers("ends", 250), "ends");
  assert.equal(resolveMarkers("all", 250), "all");
  assert.equal(resolveMarkers("none", 3), "none");
});

test("hidden values answer for strips that tile the plot edge to edge, uneven spacing too", () => {
  const cols = hitColumns([
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 40, y: 0 },
    { x: 100, y: 0 },
  ]);
  assert.deepEqual(cols, [
    { left: 0, width: 5 },
    { left: 5, width: 20 },
    { left: 25, width: 45 },
    { left: 70, width: 30 },
  ]);
  for (let i = 1; i < cols.length; i++) {
    assert.equal(cols[i].left, cols[i - 1].left + cols[i - 1].width);
  }
  assert.deepEqual(hitColumns([{ x: 50, y: 0 }]), [{ left: 0, width: 100 }]);
});

test("localized UTC dates and ticks keep their period and ignore the server timezone", () => {
  assert.equal(formatX("2025-03-31", "de-DE"), "31. März 2025");
  assert.equal(formatX("2025-03", "de-DE"), "März 2025");
  assert.equal(formatX("FY2025", "de-DE"), "FY2025");
  assert.equal(formatX("2025-Q2", "de-DE"), "Q2 2025");
  const from = Date.UTC(2025, 1, 1),
    to = Date.UTC(2025, 3, 1);
  assert.ok(timeTicks(from, to, 5, "de-DE").some((t) => t.label.includes("Mär")));
  assert.ok(
    monthTicks(from, to, 6, "de-DE").some(
      (t) =>
        t.label ===
        new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" }).format(
          new Date(Date.UTC(2025, 2, 1)),
        ),
    ),
  );
  assert.ok(numberTicks(1000, 3000, 5, "de-DE").some((t) => t.label === "2.000"));
});

test("time ticks label any span: days, weeks, months and years, never an empty axis", () => {
  const u = Date.UTC;
  // The defect: 30 daily values (1–27 Oct) got no label at all.
  const month = timeTicks(u(2026, 9, 1), u(2026, 9, 27), 5);
  assert.deepEqual(
    month.map((t) => t.label),
    ["5 Oct 2026", "12 Oct", "19 Oct", "26 Oct"],
    "a month of days ticks on Mondays, the first naming the year",
  );
  assert.ok(month.every((t) => t.pos >= 0 && t.pos <= 100));
  const week = timeTicks(u(2026, 9, 1), u(2026, 9, 7), 5);
  assert.ok(week.length >= 3 && week.length <= 5, `${week.length} day ticks over a week`);
  assert.match(week[0].label, /^\d{1,2} Oct 2026$/);
  assert.deepEqual(
    timeTicks(u(2026, 9, 1), u(2026, 9, 2), 5).map((t) => [t.pos, t.label]),
    [
      [0, "1 Oct 2026"],
      [100, "2 Oct"],
    ],
    "two days: both named",
  );
  // A span no step ticks inside is named at its ends, not left bare.
  const hours = timeTicks(u(2026, 9, 1, 6), u(2026, 9, 1, 18), 5);
  assert.ok(hours.length >= 1 && hours.every((t) => t.label));
  const turn = timeTicks(u(2025, 11, 20), u(2026, 0, 20), 5).map((t) => t.label);
  assert.deepEqual(turn, ["22 Dec 2025", "5 Jan 2026", "19 Jan"], "a new year names itself");
  const year = timeTicks(u(2025, 9, 27), u(2026, 9, 27), 5).map((t) => t.label);
  assert.deepEqual(year, ["Jan 2026", "Apr", "Jul", "Oct"], "a year of days ticks on quarters");
  const decades = timeTicks(u(1985, 0, 1), u(2026, 0, 1), 5).map((t) => t.label);
  assert.deepEqual(decades, ["1990", "2000", "2010", "2020"]);
  assert.ok(
    timeTicks(u(2026, 9, 1), u(2026, 9, 27), 5, "de-CH").some((t) => t.label.includes("Okt")),
    "day ticks speak the locale",
  );
  for (let days = 1; days <= 4000; days = Math.ceil(days * 1.37)) {
    const ticks = timeTicks(u(2026, 0, 3), u(2026, 0, 3) + days * 86_400_000, 5);
    assert.ok(ticks.length >= 1 && ticks.length <= 5, `${days} days: ${ticks.length} ticks`);
  }
  assert.equal(numberTicks(7, 7, 5).length, 1, "a single number is still named");
});

test("column labels thin out before anything is cut, and never past what fits", () => {
  const years = Array.from({ length: 12 }, (_, i) => String(2015 + i));
  assert.ok(labelWidth("2025") > 0 && labelWidth("2025") < labelWidth("Mar 2025"));
  assert.ok(labelWidth("一月") > labelWidth("ab"), "a wide character is wider");
  assert.equal(columnLabelStep(years, 900), 1, "room for every year");
  const narrow = columnLabelStep(years, 300);
  assert.ok(narrow >= 2 && narrow <= 4, `every ${narrow}th year at 300px`);
  assert.ok(columnLabelStep(years, 160) > narrow, "narrower thins further");
  assert.equal(columnLabelStep(["2025"], 40), 1);
  assert.equal(columnLabelStep(["A long first period", "B"], 60), 2, "only the first, last of all");
  // The labels a step shows never come closer than the pad, at any width.
  for (const labels of [
    years,
    ["Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025", "Jun 2025"],
    Array.from({ length: 31 }, (_, i) => `${i + 1} Oct 2026`),
  ]) {
    for (let width = 100; width <= 1400; width += 20) {
      const step = columnLabelStep(labels, width);
      assert.ok(step >= 1 && step <= labels.length);
      const pitch = (width + 8) / labels.length;
      const shown = labels.map((_, i) => i).filter((i) => i % step === 0);
      if (shown.length < 2) continue;
      // Neighbouring shown labels are at least their own half-widths apart.
      for (let k = 1; k < shown.length; k++) {
        const a = shown[k - 1],
          b = shown[k];
        assert.ok(
          (b - a) * pitch >= (labelWidth(labels[a]) + labelWidth(labels[b])) / 2,
          `${labels[a]} and ${labels[b]} at ${width}px`,
        );
      }
    }
  }
  const plan = columnLabelPlan(years);
  assert.equal(plan.length, 12);
  assert.deepEqual(plan[0], [], "the first label is shown at every width");
  assert.ok(plan[1].includes(320) && !plan[1].includes(1200), "hidden on a phone, shown wide");
  assert.ok(plan.flat().every((w) => COLUMN_AXIS_WIDTHS.includes(w)));
  assert.deepEqual(columnLabelPlan(["2024", "2025"]), [[], []], "two years always fit");
});
