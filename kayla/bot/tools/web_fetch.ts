import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod/v3";
import { isIP } from "node:net";

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  if (ipVersion === 6) {
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
      return true;
    }
  }
  return false;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export default defineTool({
  description:
    "Fetch a public https URL and return readable text. Use after web_search when a page looks useful.",
  effect: "read",
  inputSchema: z.object({
    url: z.string().url().describe("https URL to fetch"),
    maxChars: z
      .number()
      .int()
      .min(500)
      .max(30_000)
      .optional()
      .describe("Max characters of text (default 12000)"),
  }),
  async execute({ url, maxChars }) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false as const, error: "unsupported_protocol" };
    }
    if (isBlockedHost(parsed.hostname)) {
      return { ok: false as const, error: "blocked_host" };
    }

    const res = await fetch(parsed, {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; KaylaBot/1.0; +https://cursor.com)",
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(20_000),
    });

    const finalUrl = res.url;
    try {
      const finalHost = new URL(finalUrl).hostname;
      if (isBlockedHost(finalHost)) {
        return { ok: false as const, error: "blocked_redirect" };
      }
    } catch {
      return { ok: false as const, error: "bad_final_url" };
    }

    if (!res.ok) {
      return { ok: false as const, error: `http_${res.status}`, status: res.status };
    }

    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();
    const limit = maxChars ?? 12_000;
    let text: string;
    if (contentType.includes("application/json")) {
      text = raw.slice(0, limit);
    } else {
      text = htmlToText(raw).slice(0, limit);
    }

    return {
      ok: true as const,
      url: finalUrl,
      contentType,
      truncated: raw.length > limit || text.length >= limit,
      text,
    };
  },
});
