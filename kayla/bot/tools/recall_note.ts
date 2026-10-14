import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod/v3";

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default defineTool({
  description:
    "Recall a previously saved note by kebab-case key. Miss returns found:false.",
  effect: "read",
  inputSchema: z.object({
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(KEY_RE)
      .describe("Lowercase kebab-case slug, e.g. preferred-name"),
  }),
  async execute({ key }, ctx) {
    const value = await ctx.host.kv.get(`note:${key}`);
    if (typeof value !== "string") {
      return { found: false as const, key };
    }
    return { found: true as const, key, value };
  },
});
