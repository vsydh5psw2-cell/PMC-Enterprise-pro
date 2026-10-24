import { defineAgent } from "@cursor/bdk";

export default defineAgent({
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  // Personal assistant: allow the standard harness tool surface so Kayla
  // can inspect her workspace when helpful (in addition to authored tools).
  tools: ["read", "grep", "glob", "ls", "shell"],
  builtinTools: { reminders: true },
});