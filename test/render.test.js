// Every chart renders on the server (Next RSC/SSR) and carries the parts the
// standard requires: a figure, a caption, a table of the same values, a
// link where a point has a source, and nothing that needs a browser to
// exist. Rendered to a string: a chart that cannot even render without a
// browser breaks every page it is put on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BarChart,
  ColumnChart,
  DoughnutChart,
  columnScale,
  LineChart,
  Meter,
  ShareBars,
  Sparkline,
  StatTiles,
  Timeline,
} from "../dist/react/index.js";
import { COLUMN_AXIS_WIDTHS } from "../dist/index.js";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const points = [
  { x: "2025-03-31", y: 29, href: "https://example.com/q1" },
  { x: "2025-06-30", y: 29, href: "https://example.com/q2", preliminary: true },
  { x: "2025-09-30", y: 33, note: "Converted 7 GW of slots." },
];

test("LineChart: a figure, a stretched SVG, a point per value as a link, a table behind it", () => {
  const html = renderToStaticMarkup(
    h(LineChart, {
      series: [{ id: "a", label: "Backlog", points }],
      unit: "GW",
      caption: "Backlog, GW",
    }),
  );
  assert.match(html, /<figure class="ck-chart ck-chart-line"/);
  assert.match(html, /viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"/);
  assert.match(html, /vector-effect="non-scaling-stroke"/);
  assert.equal((html.match(/class="ck-pt/g) ?? []).length, 3);
  assert.match(html, /<a href="https:\/\/example.com\/q1" class="ck-pt"[^>]*target="_blank"/);
  assert.match(html, /aria-label="29 GW, 30 Jun 2025 · preliminary"/);
  assert.match(html, /<span class="ck-tip" role="tooltip">/);
  assert.match(html, /Converted 7 GW of slots\./);
  assert.match(html, /<figcaption class="ck-chart-caption">Backlog, GW<\/figcaption>/);
  assert.match(
    html,
    /<div class="ck-sr"><table class="ck-chart-table"><caption>Backlog, GW<\/caption>/,
  );
  assert.match(html, /<th scope="col">Backlog \(GW\)<\/th>/);
  assert.match(html, /<th scope="row">31 Mar 2025<\/th><td>29<\/td>/);
  assert.match(html, /<td>29 \(preliminary\)<\/td>/);
  assert.match(html, /--ck-gutter:3ch/, "the gutter is as wide as the widest tick label");
  assert.doesNotMatch(html, /useEffect|undefined|NaN/);
});

test("LineChart: markers and area — a dense line is a line, every value still reachable", () => {
  const dense = Array.from({ length: 120 }, (_, i) => ({ x: i, y: 100 + Math.sin(i / 7) * 10 }));
  const auto = renderToStaticMarkup(
    h(LineChart, {
      series: [{ id: "c", label: "Close", points: dense }],
      unit: "USD",
      caption: "Closes",
      markers: "auto",
      area: true,
    }),
  );
  assert.equal((auto.match(/class="ck-pt ck-pt-col/g) ?? []).length, 120, "a target per value");
  assert.doesNotMatch(auto, /ck-pt-marked/, "auto above the limit draws no dot");
  assert.match(auto, /class="ck-line-area" data-series="1" d="M0\.00 /);
  assert.match(auto, / Z"/);
  assert.match(auto, /--ck-y:/);
  assert.equal((auto.match(/<tr>/g) ?? []).length, 121, "the table still holds every value");
  assert.doesNotMatch(auto, /NaN|undefined/);

  const ends = renderToStaticMarkup(
    h(LineChart, {
      series: [{ id: "c", label: "Close", points }],
      caption: "Closes",
      markers: "ends",
    }),
  );
  assert.equal((ends.match(/ck-pt-marked/g) ?? []).length, 1, "only the last value is marked");
  assert.match(ends, /ck-pt-col ck-pt-marked ck-pt-end/);
  assert.doesNotMatch(ends, /ck-line-area/, "no area unless asked");

  const few = renderToStaticMarkup(
    h(LineChart, { series: [{ id: "c", label: "Close", points }], caption: "x", markers: "auto" }),
  );
  assert.doesNotMatch(few, /ck-pt-col/, "auto keeps every dot on a short series");

  const none = renderToStaticMarkup(
    h(LineChart, { series: [{ id: "c", label: "Close", points }], caption: "x", markers: "none" }),
  );
  assert.equal((none.match(/ck-pt-col/g) ?? []).length, 3);
  assert.doesNotMatch(none, /ck-pt-marked/);
  assert.match(
    none,
    /<a href="https:\/\/example.com\/q1" class="ck-pt ck-pt-col/,
    "a hidden value keeps its link",
  );
});

test("LineChart: two series share axes, get a legend and a dash each", () => {
  const html = renderToStaticMarkup(
    h(LineChart, {
      series: [
        { id: "a", label: "Backlog", points },
        { id: "b", label: "Slots", points: points.map((p) => ({ ...p, y: p.y * 2 })) },
      ],
      caption: "Two",
      yFrom: "zero",
    }),
  );
  assert.equal((html.match(/class="ck-line-path"/g) ?? []).length, 2);
  assert.match(html, /<ol class="ck-legend"/);
  assert.match(html, /data-series="2"/);
  assert.match(
    css,
    /\.ck-line-path\[data-series="2"\][^{]*\{\s*stroke-dasharray/,
    "the second series is dashed, so it survives a monochrome theme",
  );
  assert.match(html, /<span class="ck-line-tick">0<\/span>/);
});

test("BarChart: ranked largest first, a null drawn as a dash, an estimate marked, a long label shortened with its full text in title", () => {
  const html = renderToStaticMarkup(
    h(BarChart, {
      rows: [
        { label: "Japan", value: 3000, share: 0.0033 },
        { label: "China", value: 900000, share: 0.99, estimated: true, href: "/china" },
        { label: "Other countries with a very long name indeed", value: null },
      ],
      unit: "kg",
      caption: "Gallium",
      highlight: "China",
    }),
  );
  const order = [...html.matchAll(/class="ck-bar-label" title="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["China", "Japan", "Other countries with a very long name indeed"]);
  assert.match(html, /ck-bar-row ck-bar-row-hi/);
  assert.match(html, /<a href="\/china" class="ck-bar-label" title="China">China<\/a>/);
  assert.match(html, /<span class="ck-bar-none">—<\/span>/);
  assert.match(html, /<span class="ck-bar-est" title="Estimated">≈<\/span>900,000/);
  assert.match(html, /<span class="ck-bar-share">99%<\/span>/);
  assert.match(html, />Other countries with a…<\/span>/);
  assert.match(html, /style="width:100%"/);
  assert.match(html, /<td>—<\/td>/);
  assert.match(html, /<td>900,000 \(estimated\)<\/td>/);
});

test("ShareBars: one bar whose widths sum to 100%, the largest labelled inside, every segment in the legend", () => {
  const html = renderToStaticMarkup(
    h(ShareBars, {
      rows: [
        { label: "Samsung", share: 0.13 },
        { label: "Taiwan Semiconductor Manufacturing Company", share: 0.62, href: "/tsmc" },
      ],
      other: 0.25,
      caption: "Share",
    }),
  );
  const widths = [...html.matchAll(/class="ck-share-seg[^"]*"[^>]*style="width:([\d.]+)%"/g)].map(
    (m) => Number(m[1]),
  );
  assert.deepEqual(widths, [62, 13, 25]);
  assert.equal((html.match(/ck-share-inside/g) ?? []).length, 1);
  assert.match(html, /<span class="ck-share-inside">Taiwan Semico… 62%<\/span>/);
  assert.match(html, /ck-share-seg ck-share-other/);
  assert.match(
    html,
    /<a href="\/tsmc" class="ck-legend-label" title="Taiwan Semiconductor Manufacturing Company">/,
  );
  assert.match(html, /<th scope="row">Other<\/th><td>25%<\/td>/);
  assert.match(
    css,
    /@container \(min-width: 9rem\)/,
    "the inside label shows only where the segment has room",
  );
});

test("Sparkline: inline, no axes, named; nothing with one point", () => {
  const html = renderToStaticMarkup(h(Sparkline, { points, label: "Backlog over three quarters" }));
  assert.match(
    html,
    /<svg class="ck-spark"[^>]*role="img" aria-label="Backlog over three quarters"/,
  );
  assert.match(html, /style="width:88px;height:28px"/);
  assert.doesNotMatch(html, /<text/);
  assert.equal(renderToStaticMarkup(h(Sparkline, { points: [points[0]], label: "x" })), "");
});

test("Meter: the number beside a track, a real meter role, a link when it has one", () => {
  const html = renderToStaticMarkup(
    h(Meter, { value: 12, max: 12, label: "Severity", href: "/method" }),
  );
  assert.match(
    html,
    /<a href="\/method" class="ck-chart ck-meter" title="Severity: 12 of 12" style="--ck-meter:100%">/,
  );
  assert.match(html, /<span class="ck-meter-value">12<\/span>/);
  assert.match(
    html,
    /role="meter" aria-valuemin="0" aria-valuemax="12" aria-valuenow="12" aria-label="Severity"/,
  );
  assert.match(
    renderToStaticMarkup(h(Meter, { value: 7, max: 12, label: "S" })),
    /--ck-meter:58\.33/,
  );
});

test("StatTiles: an even grid, one shape per cell, a link where there is one, a table", () => {
  const html = renderToStaticMarkup(
    h(StatTiles, {
      tiles: [
        { label: "Bottlenecks mapped", value: 33, href: "/bottlenecks" },
        { label: "Rules tracked", value: 24, note: "since 2024" },
      ],
    }),
  );
  assert.match(html, /class="ck-chart ck-chart-tiles" style="--ck-n:2"/);
  assert.match(
    html,
    /<a href="\/bottlenecks" class="ck-tile"><span class="ck-tile-value">33<\/span><span class="ck-tile-label">Bottlenecks mapped<\/span><\/a>/,
  );
  assert.match(html, /<span class="ck-tile-note">since 2024<\/span>/);
  assert.match(html, /<th scope="row">Rules tracked<\/th><td>24<\/td><td>since 2024<\/td>/);
  assert.match(
    css,
    /\.ck-tiles \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    "two across on a phone",
  );
});

test("Timeline: events as anchors on month ticks, colliding ones in a second lane, each no wider than its room", () => {
  const html = renderToStaticMarkup(
    h(Timeline, {
      events: [
        {
          date: "2026-07-17",
          label: "SK Siltron liquidates its US subsidiary",
          tone: "down",
          href: "/e1",
        },
        { date: "2026-07-28", label: "Shanghai Electric wins an overseas order", tone: "up" },
        {
          date: "2026-03-27",
          label: "EU opens a safeguard investigation",
          tone: "down",
          kind: "policy",
        },
      ],
      caption: "Events",
    }),
  );
  assert.equal((html.match(/class="ck-tl-lane"/g) ?? []).length, 2, "July's two events collide");
  assert.match(html, /style="--ck-lanes:2"/);
  assert.match(
    html,
    /<a href="\/e1" class="ck-tl-event ck-tl-left" title="17 Jul 2026: SK Siltron liquidates its US subsidiary"/,
  );
  assert.match(html, /data-tone="down" data-kind="policy"/);
  assert.match(html, /--ck-room:\d/);
  assert.ok((html.match(/class="ck-tl-tick/g) ?? []).length >= 5, "a mark per month");
  assert.match(html, /<span class="ck-tl-month">Mar 2026<\/span>/);
  assert.match(
    html,
    /<th scope="row">27 Mar 2026<\/th><td>EU opens a safeguard investigation<\/td><td>down<\/td>/,
  );
});

test("no literal colour in a component: every colour is a --ck-* variable", () => {
  for (const file of ["LineChart", "Bars", "Small", "Timeline", "Figure"]) {
    const src = readFileSync(new URL(`../src/react/${file}.tsx`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, `${file}.tsx names a colour`);
  }
  for (const name of ["ink", "ink-muted", "line", "series-1", "series-6", "up", "down", "accent"]) {
    assert.match(css, new RegExp(`--ck-${name}:`), `--ck-${name} is defined`);
  }
  assert.doesNotMatch(css, /font-size:\s*0\.[0-6]\d*rem/, "no label under 0.75rem");
});

test("BarChart: a small percentage uses the explicit whole without exaggerating its share", () => {
  const html = renderToStaticMarkup(
    h(BarChart, {
      rows: [{ label: "Small share", value: 1.6 }],
      max: 100,
      unit: "%",
      caption: "Share of the whole",
    }),
  );
  assert.match(html, /style="width:1.6%"/);
  assert.match(html, /<td>1.6<\/td>/);
});

test("BarChart: the scale accommodates larger rows and ignores invalid whole values", () => {
  for (const max of [1, 0, -100, NaN, Infinity]) {
    const html = renderToStaticMarkup(
      h(BarChart, {
        rows: [{ label: "Largest", value: 25 }],
        max,
        caption: "Safe scale",
      }),
    );
    assert.match(html, /style="width:100%"/);
    assert.doesNotMatch(html, /width:(?:NaN|Infinity|2500)/);
  }
});

test("ShareBars: otherLabel names the remainder in the legend and the table", () => {
  const html = renderToStaticMarkup(
    h(ShareBars, {
      rows: [{ label: "BlackRock", share: 0.074 }],
      other: 0.926,
      otherLabel: "Others, each below 5%",
      caption: "Holders",
    }),
  );
  assert.match(html, /title="Others, each below 5%">Others, each below 5%<\/span>/);
  assert.match(html, /<th scope="row">Others, each below 5%<\/th>/);
  assert.doesNotMatch(html, />Other</);
  const plain = renderToStaticMarkup(
    h(ShareBars, { rows: [{ label: "A", share: 0.5 }], other: 0.5, caption: "c" }),
  );
  assert.match(plain, /<th scope="row">Other<\/th>/, "left out, the remainder is still Other");
});

test("columnScale: always holds zero, round steps on both sides of it", () => {
  assert.deepEqual(columnScale([10, 27]).ticks, [0, 10, 20, 30]);
  const loss = columnScale([-4, 12]);
  assert.ok(loss.min < 0 && loss.ticks.includes(0));
  assert.deepEqual(columnScale([]).ticks, [0, 0.5], "no figures: an axis, not a division by zero");
});

test("ColumnChart: periods in the order given, a loss goes down, a gap is a dash, every column focusable", () => {
  const html = renderToStaticMarkup(
    h(ColumnChart, {
      series: [
        {
          id: "rev",
          label: "Revenue",
          points: [
            { x: "FY2023", y: 27, href: "https://example.com/10k-2023" },
            { x: "FY2024", y: 61 },
            { x: "FY2025", y: 130 },
          ],
        },
        {
          id: "ni",
          label: "Net income",
          points: [
            { x: "FY2023", y: -4 },
            { x: "FY2024", y: null },
            { x: "FY2025", y: 73, note: "As last reported." },
          ],
        },
      ],
      unit: "USD bn",
      caption: "Revenue and net income",
    }),
  );
  assert.match(html, /<figure class="ck-chart ck-chart-columns"/);
  const periods = [...html.matchAll(/class="ck-col-xtick" title="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(periods, ["FY2023", "FY2024", "FY2025"]);
  assert.equal((html.match(/class="ck-col[ "]/g) ?? []).length, 5, "five figures, five columns");
  assert.equal((html.match(/ck-col-neg/g) ?? []).length, 1);
  assert.match(
    html,
    /<a href="https:\/\/example.com\/10k-2023" class="ck-col"[^>]*target="_blank"/,
  );
  assert.match(html, /aria-label="73 USD bn, FY2025 — Net income\. As last reported\."/);
  assert.match(html, /<th scope="row">FY2024<\/th><td>61<\/td><td>—<\/td>/);
  assert.match(html, /ck-col-zero/);
  assert.match(html, /class="ck-legend"/);
  assert.match(html, /--ck-periods:3/);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test("localized line, column and timeline charts retain numbers and translate accessible words", () => {
  const props = {
    series: [
      { id: "v", label: "Umsatz", points: [{ x: "2025-03-31", y: 1234.5, preliminary: true }] },
    ],
    caption: "Umsatz",
    locale: "de-DE",
    periodLabel: "Zeitraum",
    preliminaryLabel: "vorläufig",
  };
  for (const chart of [LineChart, ColumnChart]) {
    const html = renderToStaticMarkup(h(chart, props));
    assert.match(html, /Zeitraum/);
    assert.match(html, /März/);
    assert.match(html, /1\.234,5/);
    assert.doesNotMatch(html, />Period</);
  }
  const line = renderToStaticMarkup(h(LineChart, props));
  assert.match(line, /vorläufig/);
  assert.doesNotMatch(line, /preliminary/);
  const timeline = renderToStaticMarkup(
    h(Timeline, {
      events: [{ date: "2025-03-31", label: "Termin" }],
      caption: "Termine",
      locale: "de-DE",
      tableLabels: { date: "Datum", event: "Ereignis", effect: "Wirkung" },
    }),
  );
  assert.match(timeline, /März/);
  assert.match(timeline, /Datum/);
  assert.match(timeline, /Ereignis/);
});

test("reference bands extend the scale and retain their exact labelled interval", () => {
  const html = renderToStaticMarkup(
    h(LineChart, {
      series: [
        {
          id: "weight",
          label: "Weight",
          points: [
            { x: 1, y: 12 },
            { x: 2, y: 13 },
          ],
        },
      ],
      caption: "Weight",
      unit: "kg",
      referenceBands: [{ from: 10, to: 20, label: "Expected interval" }],
    }),
  );
  assert.match(html, /class="ck-reference-band"/);
  assert.match(html, /Expected interval: 10–20 kg/);
  assert.match(html, /<th scope="row">1<\/th><td>12<\/td>/);
  assert.match(html, /<th scope="row">2<\/th><td>13<\/td>/);
  assert.throws(
    () =>
      renderToStaticMarkup(
        h(LineChart, {
          series: [],
          caption: "Bad",
          referenceBands: [{ from: 20, to: 10, label: "Bad" }],
        }),
      ),
    /ascending/,
  );
  assert.throws(
    () =>
      renderToStaticMarkup(
        h(LineChart, {
          series: [],
          caption: "Bad",
          referenceBands: [{ from: 0, to: NaN, label: "Bad" }],
        }),
      ),
    /finite/,
  );
});

test("stacked columns scale to totals, retain individual values and never turn missing data into zero", () => {
  const html = renderToStaticMarkup(
    h(ColumnChart, {
      stacked: true,
      caption: "Total",
      series: [
        {
          id: "a",
          label: "A",
          points: [
            { x: "2025", y: 2 },
            { x: "2026", y: null },
          ],
        },
        {
          id: "b",
          label: "B",
          points: [
            { x: "2025", y: 4 },
            { x: "2026", y: 0 },
          ],
        },
      ],
    }),
  );
  assert.match(html, /ck-col-stacked/);
  assert.match(
    html,
    /<span class="ck-line-tick">6<\/span>/,
    "axis contains the sum, not just the largest component",
  );
  assert.match(html, /<th scope="row">2025<\/th><td>2<\/td><td>4<\/td>/);
  assert.match(html, /<th scope="row">2026<\/th><td>—<\/td><td>0<\/td>/);
  const negative = renderToStaticMarkup(
    h(ColumnChart, {
      stacked: true,
      caption: "Loss",
      series: [
        { id: "a", label: "A", points: [{ x: 1, y: -2 }] },
        { id: "b", label: "B", points: [{ x: 1, y: -4 }] },
      ],
    }),
  );
  assert.match(negative, /<span class="ck-line-tick">-6<\/span>/);
  assert.doesNotMatch(negative, /NaN|Infinity/);
});

test("doughnuts keep exact values, links and localized tables; zero total stays empty and invalid values fail", () => {
  const html = renderToStaticMarkup(
    h(DoughnutChart, {
      rows: [
        { label: "Feed", value: 75, href: "/feed" },
        { label: "Care", value: 25 },
      ],
      caption: "Costs",
      unit: "CHF",
      locale: "de-CH",
      labelHeading: "Kategorie",
      valueHeading: "Wert",
    }),
  );
  assert.match(html, /ck-chart-doughnut/);
  assert.match(html, /href="\/feed"/);
  assert.match(html, /<th scope="col">Kategorie<\/th>/);
  assert.match(html, /<th scope="row">Feed<\/th><td>75<\/td>/);
  assert.match(html, /<th scope="row">Care<\/th><td>25<\/td>/);
  const zero = renderToStaticMarkup(
    h(DoughnutChart, { rows: [{ label: "None", value: 0 }], caption: "Empty" }),
  );
  assert.doesNotMatch(zero, /NaN|Infinity/);
  assert.match(zero, /stroke-dasharray="0 /);
  for (const value of [-1, NaN, Infinity])
    assert.throws(
      () =>
        renderToStaticMarkup(h(DoughnutChart, { rows: [{ label: "Bad", value }], caption: "Bad" })),
      /non-negative/,
    );
});

test("BarChart: ordinal input order, semantic tones and localized accessible values", () => {
  const rows = [
    { label: "Unzufrieden", value: 1.5, tone: "negative", estimated: true, share: 0.125 },
    { label: "Neutral", value: 8, tone: "warning" },
    { label: "Zufrieden", value: 4, tone: "positive" },
  ];
  const html = renderToStaticMarkup(
    h(BarChart, {
      rows,
      caption: "Zufriedenheit",
      max: 20,
      order: "input",
      locale: "de-DE",
      labels: {
        row: "Stufe",
        value: "Anzahl",
        share: "Anteil",
        note: "Hinweis",
        estimated: "geschätzt",
      },
    }),
  );
  assert.ok(html.indexOf('title="Unzufrieden"') < html.indexOf('title="Neutral"'));
  assert.ok(html.indexOf('title="Neutral"') < html.indexOf('title="Zufrieden"'));
  assert.match(html, /data-tone="negative"/);
  assert.match(html, /data-tone="warning"/);
  assert.match(html, /data-tone="positive"/);
  assert.match(html, /width:7.5%/);
  assert.match(html, /<th scope="col">Anzahl<\/th>/);
  assert.match(html, /<td>1,5 \(geschätzt\)<\/td>/);
  assert.match(html, /12,5/);
  assert.deepEqual(
    rows.map((r) => r.label),
    ["Unzufrieden", "Neutral", "Zufrieden"],
  );
});

test("LineChart: thirty daily values get date labels, not a bare axis", () => {
  const days = Array.from({ length: 27 }, (_, i) => ({
    x: `2026-10-${String(i + 1).padStart(2, "0")}`,
    y: 10 + (i % 5),
  }));
  const html = renderToStaticMarkup(
    h(LineChart, { series: [{ id: "d", label: "Daily", points: days }], caption: "October" }),
  );
  const ticks = [...html.matchAll(/class="ck-line-xtick[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(ticks, ["5 Oct 2026", "12 Oct", "19 Oct", "26 Oct"]);
  assert.match(html, /<th scope="row">1 Oct 2026<\/th><td>10<\/td>/);
});

test("ColumnChart: years and months are thinned, never cut; every width band has its rule", () => {
  const years = Array.from({ length: 12 }, (_, i) => ({ x: String(2015 + i), y: i + 1 }));
  const html = renderToStaticMarkup(
    h(ColumnChart, { series: [{ id: "y", label: "Count", points: years }], caption: "Years" }),
  );
  const labels = [...html.matchAll(/class="ck-col-xlabel">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(
    labels,
    years.map((p) => p.x),
    "every year printed whole, no ellipsis",
  );
  assert.doesNotMatch(html, /…/);
  assert.match(html, /class="ck-col-xtick" title="2015"><span/, "the first is always shown");
  assert.match(html, /class="ck-col-xtick" title="2016" data-hide="[\d ]*320[\d ]*"/);
  const months = renderToStaticMarkup(
    h(ColumnChart, {
      series: [
        {
          id: "m",
          label: "Count",
          points: Array.from({ length: 12 }, (_, i) => ({
            x: `2025-${String(i + 1).padStart(2, "0")}`,
            y: i,
          })),
        },
      ],
      caption: "Months",
    }),
  );
  assert.match(months, /class="ck-col-xlabel">Sep 2025</, "a long period is no longer cut at 8");
  assert.match(css, /\.ck-col-axis \{[^}]*container: ck-col-axis \/ inline-size/);
  for (const width of COLUMN_AXIS_WIDTHS) {
    assert.match(
      css,
      new RegExp(`\\.ck-col-xtick\\[data-hide~="${width}"\\] > \\.ck-col-xlabel`),
      `a container rule hides labels planned out at ${width}px`,
    );
  }
  const few = renderToStaticMarkup(
    h(ColumnChart, { series: [{ id: "y", label: "C", points: years.slice(0, 3) }], caption: "c" }),
  );
  assert.doesNotMatch(few, /data-hide="[^"]*[1-9]/, "three years fit from the narrowest band up");
});

test("Meter: a tone by token, and the value can be left to the caller", () => {
  const toned = renderToStaticMarkup(
    h(Meter, { value: 3, max: 10, label: "Risk", tone: "negative", showValue: false }),
  );
  assert.doesNotMatch(toned, /ck-meter-value/, "no printed value");
  assert.match(toned, /title="Risk: 3 of 10"/, "the value stays in the title");
  assert.match(
    toned,
    /role="meter" aria-valuemin="0" aria-valuemax="10" aria-valuenow="3" aria-label="Risk" data-tone="negative"/,
  );
  for (const tone of ["neutral", "positive", "warning", "negative"])
    assert.match(
      css,
      new RegExp(
        `\\.ck-meter-track\\[data-tone="${tone}"\\] \\.ck-meter-fill \\{\\s*background: var\\(--ck-`,
      ),
    );
  const plain = renderToStaticMarkup(h(Meter, { value: 3, max: 10, label: "Risk" }));
  assert.match(plain, /<span class="ck-meter-value">3<\/span>/, "left out, as before");
  assert.doesNotMatch(plain, /data-tone/);
});

test("Sparkline: null breaks the line, a lone value is a dot, tones colour their points", () => {
  const html = renderToStaticMarkup(
    h(Sparkline, {
      label: "Mood over seven days: two good, one bad",
      points: [
        { x: "2026-10-01", y: 3, tone: "positive" },
        { x: "2026-10-02", y: 4 },
        { x: "2026-10-03", y: null },
        { x: "2026-10-04", y: 2, tone: "negative" },
        { x: "2026-10-05", y: null },
        { x: "2026-10-06", y: 5 },
        { x: "2026-10-07", y: 1, tone: "positive" },
      ],
    }),
  );
  const d = html.match(/<path class="ck-spark-line" d="([^"]+)"/)[1];
  assert.equal((d.match(/M/g) ?? []).length, 2, "two runs, so two strokes");
  assert.doesNotMatch(d, /100\.00(?! )/, "a gap is not drawn as zero");
  assert.equal((d.match(/L/g) ?? []).length, 2);
  assert.equal((html.match(/class="ck-spark-solo"/g) ?? []).length, 1, "the lone value");
  assert.match(html, /class="ck-spark-solo" data-tone="negative"/);
  assert.equal((html.match(/class="ck-spark-dot" data-tone="positive"/g) ?? []).length, 1);
  assert.match(
    html,
    /class="ck-spark-end" data-tone="positive" d="M100\.00 [\d.]+h0"/,
    "the end dot keeps its tone",
  );
  assert.match(html, /aria-label="Mood over seven days: two good, one bad"/);
  assert.doesNotMatch(html, /NaN|undefined/);
  for (const tone of ["positive", "warning", "negative"])
    assert.match(
      css,
      new RegExp(`\\.ck-spark \\[data-tone="${tone}"\\] \\{\\s*stroke: var\\(--ck-`),
    );
  assert.equal(
    renderToStaticMarkup(
      h(Sparkline, {
        label: "x",
        points: [
          { x: 1, y: null },
          { x: 2, y: null },
        ],
      }),
    ),
    "",
    "nothing to draw: nothing",
  );
  const before = renderToStaticMarkup(h(Sparkline, { points, label: "Backlog" }));
  assert.equal((before.match(/<path/g) ?? []).length, 2, "no nulls, no tones: a line and its end");
  assert.match(before, /class="ck-spark-end" d="M100\.00 /);
});
