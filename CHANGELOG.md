# Changelog

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
