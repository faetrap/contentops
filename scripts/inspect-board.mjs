// Diagnostic + verification instrument: renders the board in real Chrome,
// reports node counts, visibility, viewport transform, and console errors.
import puppeteer from "puppeteer-core";

const url = process.argv[2] ?? "http://localhost:4820";
const shot = process.argv[3];

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-first-run", "--disable-gpu"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${String(e).slice(0, 300)}`));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 6000)); // allow polling/fit/measure to settle

  const report = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".react-flow__node")];
    const viewport = document.querySelector(".react-flow__viewport");
    const sample = nodes.slice(0, 6).map((n) => {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return {
        cls: n.className.slice(0, 60),
        visibility: cs.visibility,
        display: cs.display,
        opacity: cs.opacity,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      };
    });
    return {
      nodeCount: nodes.length,
      visibleCount: nodes.filter((n) => {
        const cs = getComputedStyle(n);
        const r = n.getBoundingClientRect();
        return cs.visibility === "visible" && cs.display !== "none" && r.width > 0;
      }).length,
      viewportTransform: viewport ? getComputedStyle(viewport).transform : "NO VIEWPORT",
      pulse: document.querySelector(".pulse")?.textContent ?? "no pulse",
      sample,
    };
  });
  console.log(JSON.stringify(report, null, 1));
  if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.join("\n"));
  else console.log("CONSOLE ERRORS: none");
  if (shot) {
    await page.screenshot({ path: shot });
    console.log("screenshot:", shot);
  }
} finally {
  await browser.close();
}
