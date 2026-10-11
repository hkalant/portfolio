#!/usr/bin/env node
// Renders a made-up analytics dashboard and saves it as the editor's sample
// screenshot (assets/samples/sample-screenshot.png). Run once and commit the
// result: npm run make:sample
//
// Uses Playwright's Chromium. In environments with a preinstalled Chromium,
// set PLAYWRIGHT_CHROMIUM_PATH to its executable.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, "assets", "samples", "sample-screenshot.png");

const bars = [38, 52, 46, 61, 58, 72, 66, 79, 74, 88, 83, 95];
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const line = [30, 34, 33, 41, 45, 44, 52, 57, 55, 63, 68, 74];

const linePoints = line
  .map((value, index) => `${29 + index * 58.5},${400 - value * 4.6}`)
  .join(" ");

const rows = [
  ["Launch checklist", "Product", "In review", "#f59e0b", "2h ago"],
  ["Q4 onboarding emails", "Marketing", "Live", "#10b981", "Yesterday"],
  ["Pricing page test", "Growth", "Live", "#10b981", "2 days ago"],
  ["Mobile nav redesign", "Design", "Draft", "#94a3b8", "3 days ago"],
  ["Referral programme", "Growth", "In review", "#f59e0b", "4 days ago"],
  ["Help centre refresh", "Support", "Live", "#10b981", "Last week"],
];

const html = `<!doctype html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; width: 1440px; height: 900px; display: flex; }
  aside { width: 232px; background: #0f172a; color: #cbd5e1; padding: 28px 20px; display: flex; flex-direction: column; gap: 6px; }
  .brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 700; font-size: 18px; margin-bottom: 26px; }
  .brand i { width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg, #818cf8, #22d3ee); display: block; }
  .nav { padding: 10px 12px; border-radius: 10px; font-size: 14px; display: flex; gap: 10px; align-items: center; }
  .nav b { width: 16px; height: 16px; border-radius: 4px; background: #334155; display: block; }
  .nav.active { background: #1e293b; color: #fff; }
  .nav.active b { background: #818cf8; }
  main { flex: 1; padding: 30px 36px; display: flex; flex-direction: column; gap: 24px; }
  header { display: flex; align-items: center; justify-content: space-between; }
  h1 { font-size: 26px; letter-spacing: -0.02em; }
  .sub { color: #64748b; font-size: 14px; margin-top: 4px; }
  .actions { display: flex; gap: 10px; }
  .btn { padding: 9px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; border: 1px solid #e2e8f0; background: #fff; }
  .btn.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
  .label { color: #64748b; font-size: 13px; }
  .value { font-size: 28px; font-weight: 700; margin-top: 8px; letter-spacing: -0.02em; }
  .delta { font-size: 13px; margin-top: 6px; color: #059669; font-weight: 600; }
  .delta.down { color: #dc2626; }
  .grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; flex: 1; }
  .panel-title { font-weight: 600; font-size: 15px; display: flex; justify-content: space-between; }
  .chart { display: flex; align-items: flex-end; gap: 14px; height: 400px; margin-top: 22px; position: relative; }
  .bar { flex: 1; border-radius: 8px 8px 3px 3px; background: linear-gradient(180deg, #818cf8, #c7d2fe); }
  .months { display: flex; gap: 14px; margin-top: 10px; }
  .months span { flex: 1; text-align: center; color: #94a3b8; font-size: 12px; }
  svg.line { position: absolute; inset: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 14px; }
  td { padding: 13px 4px; border-top: 1px solid #f1f5f9; }
  td.muted { color: #64748b; font-size: 13px; }
  .pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: #f1f5f9; }
  .pill i { width: 7px; height: 7px; border-radius: 50%; display: block; }
  .ring { display: flex; align-items: center; gap: 22px; margin-top: 20px; }
  .legend div { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 10px; color: #334155; }
  .legend i { width: 10px; height: 10px; border-radius: 3px; display: block; }
</style>
</head>
<body>
  <aside>
    <div class="brand"><i></i>Acme Analytics</div>
    <div class="nav active"><b></b>Overview</div>
    <div class="nav"><b></b>Reports</div>
    <div class="nav"><b></b>Customers</div>
    <div class="nav"><b></b>Campaigns</div>
    <div class="nav"><b></b>Integrations</div>
    <div class="nav"><b></b>Settings</div>
  </aside>
  <main>
    <header>
      <div><h1>Good morning, Sam</h1><div class="sub">Here is what happened across your workspace this month.</div></div>
      <div class="actions"><div class="btn">Export</div><div class="btn primary">New report</div></div>
    </header>
    <section class="cards">
      <div class="card"><div class="label">Revenue</div><div class="value">$84,240</div><div class="delta">+12.4% vs last month</div></div>
      <div class="card"><div class="label">Active users</div><div class="value">23,918</div><div class="delta">+8.1% vs last month</div></div>
      <div class="card"><div class="label">Conversion</div><div class="value">4.72%</div><div class="delta">+0.6 pts</div></div>
      <div class="card"><div class="label">Churn</div><div class="value">1.9%</div><div class="delta down">+0.2 pts</div></div>
    </section>
    <section class="grid">
      <div class="card">
        <div class="panel-title"><span>Monthly revenue</span><span class="label">2026</span></div>
        <div class="chart">
          ${bars.map((value) => `<div class="bar" style="height:${value * 4}px"></div>`).join("")}
          <svg class="line" viewBox="0 0 700 400" preserveAspectRatio="none"><polyline points="${linePoints}" fill="none" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="months">${months.map((month) => `<span>${month}</span>`).join("")}</div>
      </div>
      <div class="card">
        <div class="panel-title"><span>Traffic sources</span><span class="label">Last 30 days</span></div>
        <div class="ring">
          <svg width="150" height="150" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#e2e8f0" stroke-width="6"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#6366f1" stroke-width="6" stroke-dasharray="46 54" stroke-dashoffset="25"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#22d3ee" stroke-width="6" stroke-dasharray="28 72" stroke-dashoffset="79"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f472b6" stroke-width="6" stroke-dasharray="16 84" stroke-dashoffset="51"/>
          </svg>
          <div class="legend">
            <div><i style="background:#6366f1"></i>Search · 46%</div>
            <div><i style="background:#22d3ee"></i>Direct · 28%</div>
            <div><i style="background:#f472b6"></i>Social · 16%</div>
            <div><i style="background:#e2e8f0"></i>Other · 10%</div>
          </div>
        </div>
        <table>
          ${rows
            .map(
              ([name, team, status, color, when]) =>
                `<tr><td>${name}<div class="label">${team}</div></td><td><span class="pill"><i style="background:${color}"></i>${status}</span></td><td class="muted">${when}</td></tr>`,
            )
            .join("")}
        </table>
      </div>
    </section>
  </main>
</body>
</html>`;

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.setContent(html, { waitUntil: "load" });
  await mkdir(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, type: "png" });
  console.log(`Wrote ${path.relative(process.cwd(), output)}`);
} finally {
  await browser.close();
}
