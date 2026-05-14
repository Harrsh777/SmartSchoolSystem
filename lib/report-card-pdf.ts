import type { Browser } from 'puppeteer';
import { getAppUrl } from '@/lib/env';

/**
 * Ensure relative URLs in stored HTML (e.g. /api/students/.../photo) resolve during PDF render.
 */
export function injectAbsoluteBaseHref(html: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, '');
  if (!base) return html;
  if (/<base\s+[^>]*href=/i.test(html)) {
    return html.replace(/<base\s+[^>]*>/i, `<base href="${base}/">`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}/">`);
}

export function requireAppUrlForPdf(): string {
  const url = getAppUrl().trim();
  if (!url) {
    throw new Error(
      'PDF generation requires NEXT_PUBLIC_APP_URL so images and assets resolve correctly.'
    );
  }
  return url;
}

/**
 * Render full HTML document(s) to a single PDF buffer (Chromium print pipeline).
 * Caller should inject `<base href>` when HTML uses root-relative asset URLs.
 */
export async function renderReportCardHtmlToPdfBuffer(html: string): Promise<Uint8Array> {
  let browser: Browser | null = null;
  try {
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load', timeout: 120_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });

    await page
      .evaluate(() => {
        const imgs = Array.from(document.images);
        return Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) {
                  resolve();
                  return;
                }
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
          )
        );
      })
      .catch(() => undefined);

    await new Promise((r) => setTimeout(r, 800));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return new Uint8Array(pdfBuffer);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}
