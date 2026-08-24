// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { widgetPlugins } from "@/widgets/registry";
import { ARTICLE_ORDER, GUIDE_GROUPS } from "@/guide/content";

describe("guide corpus", () => {
  it("names each widget article the same as the widget itself", () => {
    for (const plugin of widgetPlugins) {
      const article = ARTICLE_ORDER.find((entry) => entry.article.id === plugin.type);
      expect(article?.article.title).toBe(plugin.name);
    }
  });

  it("has a shipped image for every figure it references", () => {
    const shipped = new Set(
      readdirSync("public/guide")
        .filter((file) => file.endsWith(".webp"))
        .map((file) => file.replace(/\.webp$/, "")),
    );
    const missing = GUIDE_GROUPS.flatMap((group) =>
      group.articles.flatMap((article) =>
        article.blocks
          .filter((block) => block.kind === "figure")
          .map((block) => block.media)
          .filter((media) => !shipped.has(media)),
      ),
    );

    expect(missing).toEqual([]);
  });

  it("gives every article a unique id", () => {
    const ids = ARTICLE_ORDER.map((entry) => entry.article.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
