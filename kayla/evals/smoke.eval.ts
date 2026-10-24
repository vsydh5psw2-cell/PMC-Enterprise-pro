import { defineEval, includes } from "@cursor/bdk/evals";

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "save-preferred-name",
      description: "Saves a preferred name via save_note.",
      async test(t) {
        await t.send("Please remember that my preferred name is Jordan.");
        t.succeeded();
        t.calledTool("save_note");
        t.notCalledTool("recall_note");
        t.check(t.reply, includes(/jordan|saved|remember/i));
      },
    },
  ],
});
