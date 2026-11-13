import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod/v3";

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default defineTool({
  description:
    "Save a short durable note for later recall. Use kebab-case keys.",
  effect: "write",
  inputSchema: z.object({
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(KEY_RE)
      .describe("Lowercase kebab-case slug, e.g. preferred-name"),
    value: z.string().min(1).max(2000).describe("Text to remember"),
  }),
  async execute({ key, value }, ctx) {
    await ctx.host.kv.put(`note:${key}`, value);
    return { saved: true, key };
  },
});
