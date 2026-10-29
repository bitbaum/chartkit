# Changelog

## 0.7.0

Additions only; every existing prop and default behaves as before.

- **`LineChart` ticks for any span.** A dated axis now ticks on days, weeks
  (Mondays), months or years — at most five, the coarsest step that still
  gives three, the year on the first label and on the first of each new year.
  A 30-day daily series (1–27 Oct) is labelled "5 Oct 2026, 12 Oct, 19 Oct,
  26 Oct"; before, it had no date label at all. An axis is never bare: a span
  no step ticks inside is labelled at its ends, and a numeric axis with one
  value names it. (A month-tick span also no longer skips its first month.)
- **`ColumnChart` thins labels instead of cutting them.** Period labels are
  printed whole; when the plot is too narrow, every n-th steps back, planned
  on the server per band of plot width and applied by a container query on
  the axis. The 8-character cut is gone: at 390px twelve years read
  "2015 2017 … 2025" rather than "20…", and months "Jan 2025 May 2025 …"
  rather than "J…". Only a label wider than the whole plot is shortened.
  Core: `columnLabelStep`, `columnLabelPlan`, `labelWidth`,
  `COLUMN_AXIS_WIDTHS`.
- **`Meter` `tone` and `showValue`.** `tone`: `accent` (default), `neutral`,
  `positive`, `warning`, `negative`, by token. `showValue={false}` hides the
  printed number; it stays in `aria-valuenow`, the name and the title.
- **`Sparkline` gaps and tones.** `y: null` breaks the line (a lone value is
  a dot) instead of being drawn as zero; a point's `tone` colours its dot.
  Dots, the end dot included, are now drawn as round-capped strokes, so they
  render as filled dots in a stretched SVG (the end dot used to show as a
  thin ring). Types: `SparkPoint`, `ChartTone`.
- Demo and browser checks: a month of days, twelve years and twelve months of
  columns, a toned meter and a sparkline with gaps, at 320–1440px in light and
  dark, in English and de-CH.

## 0.5.0

- App-defined reference intervals in LineChart, including exact accessible bounds.
- Optional stacked ColumnChart with separate positive/negative totals and missing-value preservation.
- DoughnutChart with token colours, localized exact-value tables, source links and zero-total handling.

## 0.4.0

- Line/column charts and timelines accept an explicit locale for dates, numbers, axes, tooltips and accessible tables. Product dictionaries supply translated period, preliminary and timeline headings. Existing English output stays unchanged when omitted; dates use UTC.

## 0.3.0

- **`LineChart` `markers`** — `"all"` (default, unchanged) | `"none"` |
  `"ends"` | `"auto"`. `auto` drops the dots above 60 points on a series, so a
  year of daily closes reads as a line rather than ~250 beads; `ends` keeps
  only each series' last value. Hidden values stay reachable: each is a
  full-height strip of the plot (the strips tile it edge to edge), and hover or
  keyboard focus shows its dot, a hairline cursor and its value.
- **`LineChart` `area`** — a light fill under each line in the series' token
  colour (`color-mix` of `--ck-series-*`, never a hex).
- Core: `areaPath`, `hitColumns`, `resolveMarkers`, `AUTO_MARKER_LIMIT`,
  type `LineMarkers`.
- Browser check now runs at 1440px too, and checks the dense chart at 390 and
  1440px: no dots drawn, strips tile the plot, hover/focus shows the value on
  screen.

## 0.2.0

- `ShareBars` `otherLabel`; `ColumnChart` for values by period.
