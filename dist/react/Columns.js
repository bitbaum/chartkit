import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { columnLabelPlan, formatNumber, formatX, niceStep } from "../index.js";
import { ChartFigure } from "./Figure.js";
/**
 * A value axis that always holds zero, on round steps, below zero as well as
 * above: a loss is a column that goes down, not a short column going up.
 */
export function columnScale(values, tickCount = 3) {
    const finite = values.filter((v) => Number.isFinite(v));
    const lo = Math.min(0, ...finite);
    const hi = Math.max(0, ...finite);
    const span = hi - lo || Math.abs(hi) || 1;
    const step = niceStep(span, tickCount);
    const min = Math.floor(lo / step) * step;
    const max = Math.max(step, Math.ceil(hi / step) * step);
    const ticks = [];
    for (let v = min; v <= max + step / 2; v += step)
        ticks.push(Number(v.toPrecision(12)));
    return { min, max, ticks };
}
/**
 * Columns by period: revenue by year, a loss below the zero line. Periods
 * read left to right in the order the caller gives (fiscal labels such as
 * "FY2025" are not dates, so nothing re-sorts them), and several series sit
 * side by side in each period, each after the first told apart by its tone.
 * Every column with a figure is focusable, with its value, period and note
 * on hover and focus; a link when it has a source. The table carries every
 * figure, a missing one as "—".
 */
export function ColumnChart({ series, unit, caption, height = 176, locale, periodLabel = "Period", stacked = false, }) {
    const periods = [];
    for (const s of series)
        for (const p of s.points)
            if (!periods.some((q) => q === p.x))
                periods.push(p.x);
    const values = series.flatMap((s) => s.points.flatMap((p) => (p.y === null ? [] : [p.y])));
    const stacks = periods.map((x) => {
        let positive = 0, negative = 0;
        return series.map((s) => {
            const value = s.points.find((p) => p.x === x)?.y;
            if (value == null)
                return null;
            if (!Number.isFinite(value))
                throw new RangeError("Column values must be finite");
            const start = value >= 0 ? positive : negative;
            const end = start + value;
            if (!Number.isFinite(end))
                throw new RangeError("Column totals must be finite");
            if (value >= 0)
                positive = end;
            else
                negative = end;
            return { start, end };
        });
    });
    const scale = columnScale(stacked ? stacks.flatMap((row) => row.flatMap((s) => (s ? [s.start, s.end] : []))) : values);
    const pct = (v) => ((scale.max - v) / (scale.max - scale.min)) * 100;
    const zero = pct(0);
    const yTicks = scale.ticks.map((v) => ({ pos: pct(v), label: formatNumber(v, locale) }));
    const gutter = Math.max(...yTicks.map((t) => t.label.length)) + 1;
    const unitText = unit ? ` ${unit}` : "";
    const labels = periods.map((x) => formatX(x, locale));
    // Too many periods for the plot's width: every n-th label steps back (by a
    // container query on the axis) so the rest are printed whole. Nothing is cut.
    const hidden = columnLabelPlan(labels);
    const table = {
        head: [periodLabel, ...series.map((s) => (unit ? `${s.label} (${unit})` : s.label))],
        rows: periods.map((x) => [
            formatX(x, locale),
            ...series.map((s) => {
                const p = s.points.find((q) => q.x === x);
                return p && p.y !== null ? formatNumber(p.y, locale) : "—";
            }),
        ]),
    };
    return (_jsxs(ChartFigure, { kind: "columns", caption: caption, table: table, style: {
            "--ck-gutter": `${gutter}ch`,
            "--ck-plot-height": `${height}px`,
            "--ck-periods": periods.length,
        }, children: [_jsxs("div", { className: "ck-col-plot", children: [yTicks.map((tick) => (_jsx("div", { className: `ck-line-grid${tick.label === "0" ? " ck-col-zero" : ""}`, style: { top: `${tick.pos}%` }, "aria-hidden": "true", children: _jsx("span", { className: "ck-line-tick", children: tick.label }) }, tick.label))), unit && (_jsx("span", { className: "ck-line-unit", "aria-hidden": "true", children: unit })), _jsx("div", { className: "ck-col-groups", children: periods.map((x, at) => (_jsx("div", { className: `ck-col-group${stacked ? " ck-col-stacked" : ""}`, children: series.map((s, i) => {
                                const p = s.points.find((q) => q.x === x);
                                if (!p || p.y === null)
                                    return _jsx("span", { className: "ck-col-gap" }, s.id);
                                const segment = stacks[at][i];
                                const start = stacked && segment ? pct(segment.start) : zero;
                                const end = stacked && segment ? pct(segment.end) : pct(p.y);
                                const top = Math.min(start, end);
                                const size = Math.abs(end - start);
                                return (_jsx(Column, { point: p, locale: locale, index: (i % 6) + 1, top: top, stacked: stacked, size: size, negative: p.y < 0, unit: unitText, label: series.length > 1 ? s.label : undefined, end: at >= periods.length / 2 }, s.id));
                            }) }, String(x)))) })] }), _jsx("div", { className: "ck-col-axis", "aria-hidden": "true", children: periods.map((x, i) => (_jsx("span", { className: "ck-col-xtick", title: labels[i], "data-hide": hidden[i].length ? hidden[i].join(" ") : undefined, children: _jsx("span", { className: "ck-col-xlabel", children: labels[i] }) }, String(x)))) }), series.length > 1 && (_jsx("ol", { className: "ck-legend", "aria-hidden": "true", children: series.map((s, i) => (_jsxs("li", { className: "ck-legend-item", children: [_jsx("span", { className: "ck-legend-swatch", "data-series": (i % 6) + 1 }), s.label] }, s.id))) }))] }));
}
function Column({ point, index, top, size, negative, unit, label, end, locale, stacked, }) {
    const value = formatNumber(point.y, locale);
    const period = formatX(point.x, locale);
    const text = `${value}${unit}, ${period}${label ? ` — ${label}` : ""}${point.note ? `. ${point.note}` : ""}`;
    const className = `ck-col${negative ? " ck-col-neg" : ""}${end ? " ck-pt-end" : ""}`;
    const style = { top: `${top}%`, height: `${Math.max(size, stacked ? 0 : 0.5)}%` };
    const tip = (_jsxs("span", { className: "ck-tip", role: "tooltip", children: [_jsxs("strong", { children: [value, unit] }), _jsxs("span", { children: [label ? `${label} · ` : "", period] }), point.note && _jsx("span", { children: point.note })] }));
    const out = point.href && /^https?:\/\//.test(point.href);
    return (_jsx("span", { className: "ck-col-slot", children: point.href ? (_jsx("a", { href: point.href, className: className, "data-series": index, style: style, "aria-label": text, ...(out ? { target: "_blank", rel: "noopener noreferrer" } : {}), children: tip })) : (_jsx("span", { className: className, "data-series": index, style: style, tabIndex: 0, "aria-label": text, children: tip })) }));
}
//# sourceMappingURL=Columns.js.map