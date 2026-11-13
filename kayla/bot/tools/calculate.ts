import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod/v3";

function evalExpression(expression: string): number {
  const cleaned = expression.replace(/\s+/g, "");
  if (!/^[0-9+\-*/().,%^]+$/.test(cleaned)) {
    throw new Error("unsupported_characters");
  }
  const normalized = cleaned.replace(/\^/g, "**").replace(/%/g, "/100*");
  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict"; return (${normalized});`)();
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("non_finite_result");
  }
  return value;
}

export default defineTool({
  description:
    "Evaluate a basic arithmetic expression (+ - * / ^ % and parentheses). Prefer this over mental math for numbers.",
  effect: "read",
  inputSchema: z.object({
    expression: z
      .string()
      .min(1)
      .max(200)
      .describe("e.g. (12.5 + 3) * 2^3"),
  }),
  async execute({ expression }) {
    try {
      const result = evalExpression(expression);
      return { ok: true as const, expression, result };
    } catch (err) {
      return {
        ok: false as const,
        expression,
        error: err instanceof Error ? err.message : "calc_failed",
      };
    }
  },
});
