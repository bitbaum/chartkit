// The standard, checked in a real browser — the part no unit test can see.
//
//   pnpm run demo && node test/browser.mjs
//
// Each check is something a chart has shipped broken with:
//  - a label whose box runs past its figure (a y tick at 320px, a month at
//    the right edge), or printed over another (two events on one date)
//  - a label under 12px, which is how a chart "fits" a phone
//  - a line drawn at the wrong weight because the SVG scaled its stroke
//  - a sideways scroll at 320px
// The audit (src/audit.ts) is exported as @bitbaum/chartkit/audit so every
// product runs the same check against its own pages.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { CHART_DEFECTS_SOURCE } from "../dist/audit.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer(async (req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(root)) return res.writeHead(403).end();
  try {
    const body = await readFile(path);
    res
      .writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}/demo/index.html`;

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
  if (!ok) failures++;
};

let browser;
try {
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
} catch (e) {
  console.error(
    `FAIL no browser: ${e.message.split("\n")[0]}\n     run \`pnpm exec playwright install chromium\`, or set CHROMIUM_PATH`,
  );
  server.close();
  process.exit(1);
}
try {
  // The audit can fail: a label outside its figure and two labels printed
  // over each other are reported, two labels side by side are not. A gate
  // that cannot fail is no gate — this fixture is deliberately broken.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 600 } });
    await page.setContent(
      `<figure class="ck-chart" style="position:relative;width:200px;height:100px;margin:0;font:12px sans-serif">
         <figcaption class="ck-chart-caption" style="position:absolute;top:0">Broken</figcaption>
         <span style="position:absolute;left:150px;top:20px;white-space:nowrap">runs off the edge</span>
         <span style="position:absolute;left:10px;top:40px">one</span>
         <span style="position:absolute;left:14px;top:40px">two</span>
         <span style="position:absolute;left:10px;top:70px">left</span>
         <span style="position:absolute;left:60px;top:70px">right</span>
         <table class="ck-sr"><tr><td>hidden text is not measured</td></tr></table>
       </figure>`,
    );
    const found = await page.evaluate(`(${CHART_DEFECTS_SOURCE})(document.body)`);
    check(
      found.length === 2 &&
        found[0] === 'Broken: "runs off the edge" leaves the figure' &&
        found[1] === 'Broken: "one" overlaps "two"',
      `the audit reports a clipped label and an overlap, not neighbours (${found.join(" | ")})`,
    );
    await page.close();
  }

  for (const locale of [undefined, "de-CH"]) {
    for (const width of [320, 390, 1280, 1440]) {
      for (const dark of [false, true]) {
        const name = `${width}px ${dark ? "dark" : "light"} ${locale ?? "default"}`;
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(locale ? `${base}?locale=${locale}` : base);
        if (locale) {
          check(
            (await page
              .locator(".ck-chart-line .ck-chart-table thead th")
              .first()
              .textContent()) === "Zeitraum",
            `${name}: accessible period heading uses the app dictionary`,
          );
          check(
            (
              await page.locator(".ck-chart-line .ck-chart-table tbody").first().textContent()
            ).includes("März"),
            `${name}: dates use German month names`,
          );
        }
        if (dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
        await page.waitForSelector(".ck-chart-line .ck-pt");
        await page.waitForTimeout(100);
        const defects = await page.evaluate(`(${CHART_DEFECTS_SOURCE})(document.body)`);
        const m = await page.evaluate(() => {
          const px = (el) => parseFloat(getComputedStyle(el).fontSize);
          const texts = [...document.querySelectorAll(".ck-chart *")].filter(
            (el) =>
              !el.closest(".ck-sr") &&
              [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim()) &&
              el.getBoundingClientRect().width > 0,
          );
          const path = document.querySelector(".ck-line-path");
          const ink = getComputedStyle(document.body).color;
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            charts: document.querySelectorAll(".ck-chart").length,
            tables: document.querySelectorAll(".ck-chart .ck-chart-table").length,
            smallest: Math.min(...texts.map(px)),
            stroke: getComputedStyle(path).strokeWidth,
            lanes: document.querySelectorAll(".ck-tl-lane").length,
            points: document.querySelectorAll(".ck-pt:not(.ck-pt-col)").length,
            quiet: document.querySelectorAll(".ck-pt-col").length,
            quietShown: [...document.querySelectorAll(".ck-pt-col")].filter(
              (el) => getComputedStyle(el, "::before").opacity !== "0",
            ).length,
            quietMinHeight: Math.min(
              ...[...document.querySelectorAll(".ck-pt-col")].map(
                (el) => el.getBoundingClientRect().height,
              ),
            ),
            quietGap: (() => {
              const r = [...document.querySelectorAll(".ck-pt-col")].map((el) =>
                el.getBoundingClientRect(),
              );
              let gap = 0;
              for (let i = 1; i < r.length; i++) gap = Math.max(gap, r[i].left - r[i - 1].right);
              return gap;
            })(),
            area: document.querySelectorAll(".ck-line-area").length,
            areaFill: (() => {
              const a = document.querySelector(".ck-line-area");
              return a ? getComputedStyle(a).fill : "";
            })(),
            tickInk: getComputedStyle(document.querySelector(".ck-line-tick")).color,
            ink,
            tileCols: getComputedStyle(
              document.querySelector(".ck-tiles"),
            ).gridTemplateColumns.split(" ").length,
          };
        });
        check(
          defects.length === 0,
          `${name}: no chart text leaves its figure or overlaps another (${defects.slice(0, 6).join(" | ")})`,
        );
        check(
          (await page.locator(".ck-reference-band").count()) === 1,
          `${name}: reference interval is drawn`,
        );
        check(
          (await page.locator(".ck-col-stacked").count()) === 2,
          `${name}: periods stack their components`,
        );
        check(
          (await page.locator(".ck-chart-doughnut .ck-chart-table").count()) === 2,
          `${name}: doughnut and empty state retain their data tables`,
        );
        for (const bar of await page.locator(".ck-col-stacked .ck-col").all()) {
          await bar.hover();
          check(
            (await bar.locator(".ck-tip").evaluate((el) => getComputedStyle(el).display)) ===
              "flex",
            `${name}: every stacked segment exposes its own value on hover`,
          );
        }
        // The three gaps found when apps adopted 0.6.0, measured where they showed.
        const g = await page.evaluate(() => {
          const shown = (el) =>
            getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
          const figure = (text) =>
            [...document.querySelectorAll(".ck-chart")].find((f) =>
              f.querySelector(".ck-chart-caption")?.textContent.includes(text),
            );
          const columns = (text) => {
            const labels = [...figure(text).querySelectorAll(".ck-col-xlabel")];
            const visible = labels.filter(shown);
            return {
              total: labels.length,
              visible: visible.length,
              whole: visible.every(
                (l) =>
                  l.scrollWidth <= l.clientWidth + 0.5 && l.textContent === l.parentElement.title,
              ),
              first: shown(labels[0]),
            };
          };
          const probe = (color) => {
            const el = document.createElement("span");
            el.style.color = color;
            document.body.append(el);
            const c = getComputedStyle(el).color;
            el.remove();
            return c;
          };
          const risk = document.querySelector('.ck-meter-track[data-tone="negative"]');
          const spark = [...document.querySelectorAll(".ck-spark")].at(-1);
          return {
            dayTicks: [...figure("1 to 27 October").querySelectorAll(".ck-line-xtick")].filter(
              shown,
            ).length,
            years: columns("by year, 2015 to 2026"),
            months: columns("by month, 2025"),
            meterFill: getComputedStyle(risk.querySelector(".ck-meter-fill")).backgroundColor,
            meterValue: risk.parentElement.querySelector(".ck-meter-value") === null,
            down: probe("var(--ck-down)"),
            up: probe("var(--ck-up)"),
            solo: spark.querySelectorAll(".ck-spark-solo").length,
            dot: getComputedStyle(spark.querySelector('.ck-spark-dot[data-tone="positive"]'))
              .stroke,
            breaks: (spark.querySelector(".ck-spark-line").getAttribute("d").match(/M/g) ?? [])
              .length,
          };
        });
        check(g.dayTicks >= 1, `${name}: a month of days carries date labels (${g.dayTicks})`);
        for (const [what, c] of [
          ["years", g.years],
          ["months", g.months],
        ]) {
          check(
            c.whole && c.first && c.visible >= 2,
            `${name}: ${what} are printed whole, ${c.visible} of ${c.total} shown (${JSON.stringify(c)})`,
          );
          // "Sept. 2025" is wider than "Sep 2025": de-CH months may thin even wide.
          if (width >= 1280 && (what === "years" || !locale))
            check(c.visible === c.total, `${name}: wide, every one of the ${what} is shown`);
        }
        if (width <= 390)
          check(g.years.visible < g.years.total, `${name}: on a phone the years thin out`);
        check(
          g.meterFill === g.down && g.meterValue,
          `${name}: a toned meter fills in its token, value left to the caller (${g.meterFill})`,
        );
        check(
          g.solo === 1 && g.breaks === 3 && g.dot === g.up,
          `${name}: sparkline breaks at a gap and colours its days (${JSON.stringify(g)})`,
        );
        check(m.overflow <= 0, `${name}: no horizontal scroll (${m.overflow}px over)`);
        check(m.smallest >= 12, `${name}: no label under 12px (${m.smallest}px)`);
        check(
          m.stroke === "2px",
          `${name}: the line is 2px whatever the plot's size (${m.stroke})`,
        );
        check(
          m.charts >= 8 && m.tables >= 6,
          `${name}: ${m.charts} charts, ${m.tables} tables behind them`,
        );
        check(m.lanes >= 2, `${name}: colliding events took a second lane (${m.lanes} lanes)`);
        check(m.points === 20, `${name}: every value is a point (${m.points})`);
        check(
          m.quiet > 200 && m.quietShown === 0,
          `${name}: a year of closes draws no dots (${m.quietShown} of ${m.quiet} shown)`,
        );
        check(
          m.quietMinHeight >= 44 && m.quietGap <= 0.5,
          `${name}: hidden values are full-height strips that tile the plot (${m.quietMinHeight}px tall, gap ${m.quietGap}px)`,
        );
        check(
          m.area === 1 && m.areaFill && m.areaFill !== "none" && m.areaFill !== "rgb(0, 0, 0)",
          `${name}: area draws one light fill (${m.areaFill})`,
        );
        check(m.tileCols === (width < 640 ? 2 : 4), `${name}: tiles ${m.tileCols} across`);
        check(m.tickInk !== m.ink, `${name}: tick labels in the muted ink, not the text ink`);
        check(errors.length === 0, `${name}: no page errors ${errors.join(" | ")}`);
        if (process.env.CHARTKIT_SHOTS) {
          await page.screenshot({
            path: `${process.env.CHARTKIT_SHOTS}/demo-${width}-${dark ? "dark" : "light"}-${locale ?? "default"}.png`,
            fullPage: true,
          });
        }
        await page.close();
      }
    }
  }

  // A point's tooltip appears on keyboard focus, not only on hover.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(base);
    await page.waitForSelector(".ck-chart-line .ck-pt");
    await page.focus(".ck-chart-line .ck-pt");
    const shown = await page.evaluate(
      () => getComputedStyle(document.activeElement.querySelector(".ck-tip")).display,
    );
    check(shown === "flex", `a focused point shows its value (${shown})`);
    await page.close();
  }

  // A hidden dot still answers: hover shows the dot, the cursor and the value,
  // and the tooltip stays inside the viewport at the right edge.
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base);
    await page.waitForSelector(".ck-pt-col");
    await page.focus(".ck-pt-col");
    const focused = await page.evaluate(
      () => getComputedStyle(document.activeElement.querySelector(".ck-tip")).display,
    );
    check(focused === "flex", `${width}px: a focused hidden value shows its value (${focused})`);
    const last = page.locator(".ck-pt-col").last();
    await last.scrollIntoViewIfNeeded();
    await last.hover();
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll(".ck-pt-col")].at(-1);
      const tip = el.querySelector(".ck-tip");
      const box = tip.getBoundingClientRect();
      return {
        tip: getComputedStyle(tip).display,
        dot: getComputedStyle(el, "::before").opacity,
        right: box.right,
        left: box.left,
        vw: window.innerWidth,
      };
    });
    check(
      r.tip === "flex" && r.dot === "1" && r.left >= 0 && r.right <= r.vw,
      `${width}px: hovering a hidden value shows its dot and value, on screen (${JSON.stringify(r)})`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall browser checks passed");
