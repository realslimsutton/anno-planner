import type { Browser } from "playwright";
import { chromium } from "playwright";
import sharp from "sharp";

import { env } from "@/env";
import { getLayoutSlug } from "@/lib/utils";

let browser: Browser | null = null;

async function getBrowser() {
  browser ??= await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browser;
}

export async function captureLayoutScreenshot(
  hash: string,
  title: string,
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width: 1200, height: 800 });

    const slug = getLayoutSlug(title, hash);
    const url = `${env.APP_URL}/layouts/${slug}/preview?ui=false`;
    await page.goto(url, { waitUntil: "networkidle" });

    await page.waitForSelector("canvas", { timeout: 10000 });
    await page.waitForTimeout(500); // Extra time for rendering

    const pngBuffer = await page.screenshot({ type: "png" });

    const webpBuffer = await sharp(pngBuffer).webp({ quality: 85 }).toBuffer();

    return webpBuffer;
  } finally {
    await page.close();
  }
}
