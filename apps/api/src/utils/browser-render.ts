import { chromium, type Browser, type Page } from 'playwright-core';
import { env } from '@cio/core/config/env';
import { CERTIFICATE_VIEWPORT } from '@cio/certificates';

export type RenderViewport = {
  width: number;
  height: number;
  deviceScaleFactor?: number;
};

export type PdfPageOptions = {
  width?: string;
  height?: string;
  landscape?: boolean;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
};

const DEFAULT_CHROMIUM_PATH = '/usr/bin/chromium';
const RENDER_TIMEOUT_MS = 30000;
const DEFAULT_VIEWPORT: RenderViewport = { width: 1280, height: 800 };
// Fonts come from the system font directory so renders are identical without internet access.
const REMOTE_FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

let browserPromise: Promise<Browser> | null = null;

function launchBrowser() {
  const launching = chromium.launch({
    executablePath: env.CHROMIUM_EXECUTABLE_PATH || DEFAULT_CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });
  return launching.then((browser) => {
    browser.on('disconnected', () => {
      browserPromise = null;
    });
    return browser;
  });
}

function getBrowser() {
  browserPromise ??= launchBrowser().catch((error) => {
    browserPromise = null;
    throw error;
  });
  return browserPromise;
}

async function withRenderedPage<T>(
  html: string,
  styles: string | undefined,
  viewport: RenderViewport,
  render: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    await page.route(REMOTE_FONT_HOSTS, (route) => route.abort());
    await page.setContent(html, { waitUntil: 'load' });
    if (styles) await page.addStyleTag({ content: styles });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    return await render(page);
  } finally {
    await context.close();
  }
}

/** Renders HTML (plus optional extra CSS) to a PDF with the local Chromium. */
export async function renderHtmlToPdf(
  html: string,
  styles?: string,
  viewport: RenderViewport = DEFAULT_VIEWPORT,
  pdfOptions: PdfPageOptions = { printBackground: true }
): Promise<Buffer> {
  return withRenderedPage(html, styles, viewport, async (page) => Buffer.from(await page.pdf(pdfOptions)));
}

/** Renders HTML (plus optional extra CSS) to a PNG of the viewport with the local Chromium. */
export async function renderHtmlToPng(
  html: string,
  styles?: string,
  viewport: RenderViewport = { ...CERTIFICATE_VIEWPORT, deviceScaleFactor: 2 }
): Promise<Buffer> {
  const scaledViewport = { ...viewport, deviceScaleFactor: viewport.deviceScaleFactor ?? 2 };
  return withRenderedPage(html, styles, scaledViewport, async (page) =>
    Buffer.from(await page.screenshot({ type: 'png', fullPage: false }))
  );
}
