import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod/v3";

type Hit = { title: string; url: string; snippet: string };

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapDuckLink(href: string): string | null {
  try {
    if (href.startsWith("//")) href = `https:${href}`;
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    return null;
  }
  return null;
}

async function searchDuckDuckGoLite(query: string, limit: number): Promise<Hit[]> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; KaylaBot/1.0; +https://cursor.com)",
      accept: "text/html",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const results: Hit[] = [];
  const seen = new Set<string>();

  // Primary result links on DDG Lite
  const re =
    /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null && results.length < limit) {
    const href = match[1] ?? "";
    const title = decodeEntities(match[2] ?? "");
    if (!title || title.length < 2) continue;
    if (href.includes("duckduckgo.com/y.js")) continue;
    if (href.includes("duckduckgo-help-pages")) continue;
    const finalUrl = unwrapDuckLink(href);
    if (!finalUrl || !finalUrl.startsWith("http")) continue;
    if (seen.has(finalUrl)) continue;
    // skip chrome/header/nav links on DDG itself
    try {
      const host = new URL(finalUrl).hostname;
      if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com")) {
        continue;
      }
    } catch {
      continue;
    }
    if (title.toLowerCase() === "here" || title.toLowerCase() === "duckduckgo") {
      continue;
    }
    seen.add(finalUrl);
    results.push({ title, url: finalUrl, snippet: "" });
  }
  return results;
}

async function searchWikipedia(query: string, limit: number): Promise<Hit[]> {
  const api = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&namespace=0&format=json`;
  const res = await fetch(api, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as [string, string[], string[], string[]];
  const titles = data[1] ?? [];
  const descriptions = data[2] ?? [];
  const links = data[3] ?? [];
  const hits: Hit[] = [];
  for (let i = 0; i < titles.length; i++) {
    hits.push({
      title: titles[i] ?? "",
      url: links[i] ?? "",
      snippet: descriptions[i] ?? "",
    });
  }
  return hits.filter((h) => h.url.startsWith("http"));
}

export default defineTool({
  description:
    "Search the public web for current information. Use before answering time-sensitive or factual questions you are unsure about.",
  effect: "read",
  inputSchema: z.object({
    query: z.string().min(2).max(300).describe("Search query"),
    limit: z.number().int().min(1).max(8).optional().describe("Max results (default 5)"),
  }),
  async execute({ query, limit }) {
    const max = limit ?? 5;
    const [ddg, wiki] = await Promise.all([
      searchDuckDuckGoLite(query, max),
      searchWikipedia(query, Math.min(3, max)),
    ]);

    const seen = new Set<string>();
    const results: Hit[] = [];
    for (const hit of [...ddg, ...wiki]) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      results.push(hit);
      if (results.length >= max) break;
    }

    return {
      ok: true as const,
      query,
      results,
      sources: ["duckduckgo_lite", "wikipedia_opensearch"],
    };
  },
});
