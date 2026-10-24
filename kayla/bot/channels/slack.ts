import { slackChannel } from "@cursor/bdk/channels/slack";

/**
 * Slack channel (Socket Mode).
 *
 * Tokens: KAYLA_SLACK_BOT_TOKEN + KAYLA_SLACK_APP_TOKEN
 * (see .agent-serve/slack/env.example).
 *
 * Full setup: bdk slack setup
 */
export default slackChannel({
  envPrefix: "KAYLA",
  suggestedPrompts: [
    { title: "مرحبا", message: "مرحبا كايلا، عرفيني عن نفسك باختصار." },
    { title: "تذكير", message: "تذكرّي أن اسمي المفضّل هو …" },
  ],
});
