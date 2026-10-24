import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod/v3";

export default defineTool({
  description:
    "Get the current date/time. Defaults to Asia/Dubai unless a timezone is provided.",
  effect: "read",
  inputSchema: z.object({
    timeZone: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe("IANA timezone, e.g. Asia/Dubai or America/New_York"),
  }),
  async execute({ timeZone }) {
    const zone = timeZone || "Asia/Dubai";
    const now = new Date();
    let formatted: string;
    try {
      formatted = new Intl.DateTimeFormat("ar-AE", {
        timeZone: zone,
        dateStyle: "full",
        timeStyle: "long",
      }).format(now);
    } catch {
      return { ok: false as const, error: "invalid_timezone", timeZone: zone };
    }
    return {
      ok: true as const,
      iso: now.toISOString(),
      timeZone: zone,
      formatted,
      epochMs: now.getTime(),
    };
  },
});
