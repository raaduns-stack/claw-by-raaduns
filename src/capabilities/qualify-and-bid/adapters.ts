import type { SourceAdapter, SourcePlatform, AuthState } from "../../core/source-adapter.js";
import type { Opportunity } from "../../core/types.js";
import { withPersistentBrowser } from "../../core/browser-session.js";
import { loadPlatformCredentials, updatePlatformAuthState } from "../../core/source-platform-repository.js";

function blockedState(text: string): AuthState | null {
  const value = text.toLowerCase();
  if (value.includes("captcha")) return "CAPTCHA_REQUIRED";
  if (value.includes("two-factor") || value.includes("two factor") || value.includes("mfa")) return "MFA_REQUIRED";
  return null;
}

export class NaijaBusinessAdapter implements SourceAdapter {
  readonly platform: SourcePlatform;

  constructor(platform: SourcePlatform) {
    this.platform = platform;
  }

  async authenticate(): Promise<AuthState> {
    const credentials = await loadPlatformCredentials(this.platform.sourceId);
    if (!credentials?.username || !credentials.password) {
      await updatePlatformAuthState(this.platform.sourceId, "LOGIN_FAILED", "No runtime credentials configured.");
      return "LOGIN_FAILED";
    }

    try {
      return await withPersistentBrowser(this.platform.sourceId, async context => {
        const page = await context.newPage();
        const baseUrl = this.platform.baseUrl.replace(/\/$/, "");
        await page.goto(baseUrl + "/login.php", { waitUntil: "domcontentloaded" });

        const pageText = await page.locator("body").innerText();
        const blocked = blockedState(pageText);
        if (blocked) {
          await updatePlatformAuthState(this.platform.sourceId, blocked, "Human authentication control detected.");
          return blocked;
        }

        const loginForm = page.locator('form[method="post"]').filter({ has: page.locator('input[name="identifier"]') });
        if (await page.locator("#cookieAcceptBtn").count()) await page.locator("#cookieAcceptBtn").click().catch(() => undefined);
        if (await loginForm.count()) {
          await loginForm.locator('input[name="identifier"]').fill(credentials.username);
          await loginForm.locator('input[name="password"]').fill(credentials.password);
          await loginForm.locator('button[type="submit"]').click({ timeout: 10000 });
          await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => undefined);
        }

        const finalText = await page.locator("body").innerText();
        const finalBlocked = blockedState(finalText);
        if (finalBlocked) {
          await updatePlatformAuthState(this.platform.sourceId, finalBlocked, "Human authentication control detected.");
          return finalBlocked;
        }

        const stillLogin = await page.locator('input[name="identifier"]').count();
        if (stillLogin || page.url().includes("/login.php")) {
          await updatePlatformAuthState(this.platform.sourceId, "LOGIN_FAILED", "NaijaBusiness login form remained after authentication attempt.");
          return "LOGIN_FAILED";
        }

        await updatePlatformAuthState(this.platform.sourceId, "AUTHENTICATED");
        return "AUTHENTICATED";
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown authentication error.";
      await updatePlatformAuthState(this.platform.sourceId, "ERROR", message.slice(0, 500));
      return "ERROR";
    }
  }

  async healthCheck(): Promise<AuthState> {
    try {
      return await withPersistentBrowser(this.platform.sourceId, async context => {
        const page = await context.newPage();
        const baseUrl = this.platform.baseUrl.replace(/\/$/, "");
        await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded" });
        const text = await page.locator("body").innerText();
        const blocked = blockedState(text);
        if (blocked) return blocked;
        if (await page.locator('input[name="identifier"]').count()) {
          await updatePlatformAuthState(this.platform.sourceId, "SESSION_EXPIRED");
          return "SESSION_EXPIRED";
        }
        await updatePlatformAuthState(this.platform.sourceId, "AUTHENTICATED");
        return "AUTHENTICATED";
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown health-check error.";
      await updatePlatformAuthState(this.platform.sourceId, "ERROR", message.slice(0, 500));
      return "ERROR";
    }
  }

  async discover(cursor = "1"): Promise<{ opportunities: Opportunity[]; nextCursor?: string }> {
    return withPersistentBrowser(this.platform.sourceId, async context => {
      const page = await context.newPage();
      const pageNumber = Math.max(1, Number.parseInt(cursor, 10) || 1);
      const baseUrl = this.platform.baseUrl.replace(/\/$/, "");
      await page.goto(baseUrl + "/?q=&sector=&type=&page=" + pageNumber, { waitUntil: "domcontentloaded" });

      const text = await page.locator("body").innerText();
      const blocked = blockedState(text);
      if (blocked) throw new Error("NaijaBusiness discovery blocked: " + blocked);
      if (await page.locator('input[name="identifier"]').count()) throw new Error("NaijaBusiness session expired.");

      const discoveredAt = new Date();
      const candidates = await page.locator('a[href*="/tender/"]').evaluateAll(anchors => anchors.map(anchor => {
        const href = (anchor as HTMLAnchorElement).href;
        const title = (anchor.textContent || "").trim().split("\n")[0].trim();
        let node: HTMLElement | null = anchor.parentElement;
        let cardText = (anchor.textContent || "").trim();
        for (let i = 0; i < 5 && node; i += 1, node = node.parentElement) {
          const candidate = (node.innerText || "").trim();
          if (candidate.includes("Closes:")) {
            cardText = candidate;
            break;
          }
        }
        return { href, title, cardText };
      }));

      const seen = new Set<string>();
      const opportunities: Opportunity[] = [];
      for (const item of candidates) {
        const sourceOpportunityId = item.href.split("/tender/")[1]?.split(/[?#]/)[0];
        if (!sourceOpportunityId || seen.has(sourceOpportunityId)) continue;
        seen.add(sourceOpportunityId);
        const title = item.title || item.cardText.split("\n")[0]?.trim() || "Untitled opportunity";
        const lines = item.cardText.split("\n").map(line => line.trim()).filter(Boolean);
        const sector = lines.find(line => /^(General|Agriculture|ICT|Health|Construction|Consultancy)$/i.test(line));
        const typeLine = lines.find(line => /^(RFP|RFQ|EOI|Tender|Auction)$/i.test(line));
        const closeMatch = item.cardText.match(/Closes:\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
        let closingAt: Date | undefined;
        if (closeMatch) {
          const parsed = new Date(closeMatch[2] + " " + closeMatch[1] + ", " + closeMatch[3] + " 17:00:00 GMT+0100");
          if (!Number.isNaN(parsed.getTime())) closingAt = parsed;
        }
        const orgMatch = title.match(/^(.+?)[-–]\s*(?:REQUEST|INVITATION|EXPRESSION|AUCTION|PROCUREMENT|CALL|TENDER)/i);
        opportunities.push({
          opportunityId: item.href,
          sourceId: this.platform.sourceId,
          sourceOpportunityId,
          sourceUrl: item.href,
          discoveredAt,
          title,
          opportunityType: /rfq/i.test(typeLine || title) ? "rfq" : /rfp/i.test(typeLine || title) ? "contract" : /eoi/i.test(typeLine || title) ? "eoi" : /tender/i.test(typeLine || title) ? "tender" : "other",
          issuingOrganization: orgMatch?.[1]?.trim(),
          industry: sector,
          location: "Nigeria",
          closingAt,
          requirements: [],
          eligibilityRequirements: [],
          capabilitiesRequired: [],
          certificationsRequired: [],
          experienceRequired: [],
          sourceEvidence: [item.cardText.slice(0, 4000)]
        });
      }

      const nextCursor = await page.locator('a[href*="page=' + (pageNumber + 1) + '"]').count();
      return { opportunities, nextCursor: nextCursor ? String(pageNumber + 1) : undefined };
    });
  }

  async getOpportunity(sourceOpportunityId: string): Promise<Opportunity> {
    return withPersistentBrowser(this.platform.sourceId, async context => {
      const page = await context.newPage();
      const baseUrl = this.platform.baseUrl.replace(/\/$/, "");
      const url = sourceOpportunityId.startsWith("http") ? sourceOpportunityId : baseUrl + "/tender/" + encodeURIComponent(sourceOpportunityId);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      if (await page.locator('input[name="identifier"]').count()) throw new Error("NaijaBusiness session expired.");
      const text = await page.locator("body").innerText();
      const title = ((await page.locator("h1").first().innerText().catch(() => "")) || await page.title()).trim();
      const typeMatch = text.match(/\b(RFP|RFQ|EOI|Tender|Auction)\b/i);
      const closeMatch = text.match(/Closes:\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
      let closingAt: Date | undefined;
      if (closeMatch) {
        const parsed = new Date(closeMatch[2] + " " + closeMatch[1] + ", " + closeMatch[3] + " 17:00:00 GMT+0100");
        if (!Number.isNaN(parsed.getTime())) closingAt = parsed;
      }
      const orgMatch = title.match(/^(.+?)[-–]\s*(?:REQUEST|INVITATION|EXPRESSION|AUCTION|PROCUREMENT|CALL|TENDER)/i);
      return {
        opportunityId: url,
        sourceId: this.platform.sourceId,
        sourceOpportunityId: url.split("/tender/")[1]?.split(/[?#]/)[0] || sourceOpportunityId,
        sourceUrl: url,
        discoveredAt: new Date(),
        title,
        opportunityType: /rfq/i.test(typeMatch?.[1] || title) ? "rfq" : /rfp/i.test(typeMatch?.[1] || title) ? "contract" : /eoi/i.test(typeMatch?.[1] || title) ? "eoi" : /tender/i.test(typeMatch?.[1] || title) ? "tender" : "other",
        issuingOrganization: orgMatch?.[1]?.trim(),
        location: "Nigeria",
        closingAt,
        requirements: [],
        eligibilityRequirements: [],
        capabilitiesRequired: [],
        certificationsRequired: [],
        experienceRequired: [],
        sourceEvidence: [text.slice(0, 12000)]
      };
    });
  }

  async getDocuments(sourceOpportunityId: string): Promise<unknown[]> {
    return withPersistentBrowser(this.platform.sourceId, async context => {
      const page = await context.newPage();
      const baseUrl = this.platform.baseUrl.replace(/\/$/, "");
      const url = sourceOpportunityId.startsWith("http") ? sourceOpportunityId : baseUrl + "/tender/" + encodeURIComponent(sourceOpportunityId);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return page.locator("a[href]").evaluateAll(anchors => anchors.map(anchor => ({
        url: (anchor as HTMLAnchorElement).href,
        text: (anchor.textContent || "").trim()
      })).filter(item => /\.(pdf|docx?|xlsx?|zip)(?:$|[?#])/i.test(item.url)));
    });
  }

  async downloadDocuments(sourceOpportunityId: string): Promise<unknown[]> {
    return withPersistentBrowser(this.platform.sourceId, async context => {
      const page = await context.newPage();
      const baseUrl = this.platform.baseUrl.replace(/\/$/, "");
      const url = sourceOpportunityId.startsWith("http") ? sourceOpportunityId : baseUrl + "/tender/" + encodeURIComponent(sourceOpportunityId);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const links = await page.locator("a[href]").evaluateAll(anchors => anchors.map(anchor => ({
        url: (anchor as HTMLAnchorElement).href,
        text: (anchor.textContent || "").trim()
      })).filter(item => /\.(pdf|docx?|xlsx?|zip)(?:$|[?#])/i.test(item.url)));
      const { mkdir, writeFile } = await import("node:fs/promises");
      const { createHash } = await import("node:crypto");
      const { join } = await import("node:path");
      const root = new URL("../../../../data/tender-documents/", import.meta.url).pathname;
      const opportunityKey = createHash("sha256").update(sourceOpportunityId).digest("hex").slice(0, 24);
      const dir = join(root, this.platform.sourceId, opportunityKey);
      await mkdir(dir, { recursive: true, mode: 0o700 });
      const downloaded: Array<{url:string;text:string;path:string;bytes:number;sha256:string}> = [];
      for (const link of links) {
        const response = await context.request.get(link.url);
        if (!response.ok()) continue;
        const body = await response.body();
        const name = new URL(link.url).pathname.split("/").pop() || "document";
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180);
        const filePath = join(dir, safeName);
        await writeFile(filePath, body, { mode: 0o600 });
        downloaded.push({url:link.url,text:link.text,path:filePath,bytes:body.length,sha256:createHash("sha256").update(body).digest("hex")});
      }
      return downloaded;
    });
  }

  async submit(_sourceOpportunityId: string, _bidPackage: unknown): Promise<{ submissionReference: string }> {
    throw new Error("NaijaBusiness submission workflow is the next adapter implementation step.");
  }

  async getSubmissionStatus(_sourceOpportunityId: string, _submissionReference: string): Promise<unknown> {
    throw new Error("NaijaBusiness submission-status workflow is the next adapter implementation step.");
  }

  async logout(): Promise<void> {
    await withPersistentBrowser(this.platform.sourceId, async context => {
      await context.clearCookies();
      await context.clearPermissions();
    });
    await updatePlatformAuthState(this.platform.sourceId, "NOT_AUTHENTICATED");
  }}
