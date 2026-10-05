import { chromium, type BrowserContext } from "playwright";
import { mkdir, chmod } from "node:fs/promises";
import { join } from "node:path";

const SESSION_ROOT = new URL("../../data/browser-sessions/", import.meta.url);

export async function withPersistentBrowser<T>(sourceId: string, work: (context: BrowserContext) => Promise<T>) {
  const root = SESSION_ROOT.pathname;
  const sessionDir = join(root, sourceId);
  await mkdir(sessionDir, { recursive: true, mode: 0o700 });
  await chmod(sessionDir, 0o700);

  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: true,
    viewport: { width: 1440, height: 1000 }
  });

  try {
    return await work(context);
  } finally {
    await context.close();
  }
}
