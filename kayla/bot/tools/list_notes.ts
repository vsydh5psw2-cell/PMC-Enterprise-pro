import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod/v3";
import { supportsKvCas } from "@cursor/bdk";

export default defineTool({
  description:
    "List saved note keys (and optionally values). Use when the user asks what you remember.",
  effect: "read",
  inputSchema: z.object({
    includeValues: z
      .boolean()
      .optional()
      .describe("If true, include note values (default false)"),
  }),
  async execute({ includeValues }, ctx) {
    const kv = ctx.host.kv;
    if (!supportsKvCas(kv) || typeof kv.listKeys !== "function") {
      return {
        ok: false as const,
        error: "list_unsupported",
        hint: "Ask for a specific key with recall_note instead.",
      };
    }
    const keys = (await kv.listKeys("note:")).sort();
    if (!includeValues) {
      return {
        ok: true as const,
        keys: keys.map((k) => k.replace(/^note:/, "")),
        count: keys.length,
      };
    }
    const notes: { key: string; value: string }[] = [];
    for (const full of keys) {
      const value = await kv.get(full);
      if (typeof value === "string") {
        notes.push({ key: full.replace(/^note:/, ""), value });
      }
    }
    return { ok: true as const, notes, count: notes.length };
  },
});
