type GuideSettingsTab = "general" | "accounts" | "shortcuts" | "about";

export type GuideBlock =
  | { kind: "prose"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "callout"; title: string; text: string }
  | { kind: "steps"; steps: { title: string; text: string }[] }
  | { kind: "list"; items: { title: string; text: string }[] }
  | { kind: "toolbar"; steps: { title: string; text: string }[] }
  | { kind: "figure"; media: string; alt: string; caption: string }
  | { kind: "settingsLink"; tab: GuideSettingsTab; label: string }
  | { kind: "link"; href: string; label: string };

export type GuideArticle = {
  id: string;
  title: string;
  lead: string;
  blocks: GuideBlock[];
};

export type GuideGroup = {
  id: string;
  title: string;
  articles: readonly GuideArticle[];
};

export type ArticleLocation = {
  group: GuideGroup;
  article: GuideArticle;
};
