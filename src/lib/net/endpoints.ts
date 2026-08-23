export type EndpointAccess = "host-permission" | "cors";

export type Endpoint = {
  host: string;
  usedBy: string;
  reason: string;
  access: EndpointAccess;
};

export const ENDPOINTS: readonly Endpoint[] = [
  {
    host: "https://www.googleapis.com/*",
    usedBy: "integrations/providers/google, widgets/calendar",
    reason: "Google account profile and Calendar events",
    access: "host-permission",
  },
  {
    host: "https://graph.microsoft.com/*",
    usedBy: "integrations/providers/microsoft, widgets/calendar",
    reason: "Microsoft account profile and Outlook calendars",
    access: "host-permission",
  },
  {
    host: "https://api.spotify.com/*",
    usedBy: "integrations/providers/spotify, widgets/spotify",
    reason: "Playback state, devices, queue and search",
    access: "host-permission",
  },
  {
    host: "https://accounts.spotify.com/*",
    usedBy: "integrations/providers/spotify",
    reason: "Spotify PKCE token exchange and refresh",
    access: "host-permission",
  },
  {
    host: "https://api.github.com/*",
    usedBy: "integrations/providers/github, widgets/github, settings/tabs/AboutTab",
    reason: "Profile, notifications, contributions, releases",
    access: "host-permission",
  },
  {
    host: "https://api.open-meteo.com/*",
    usedBy: "widgets/weather",
    reason: "Forecast data (keyless)",
    access: "host-permission",
  },
  {
    host: "https://geocoding-api.open-meteo.com/*",
    usedBy: "widgets/weather",
    reason: "Place search for the location picker",
    access: "host-permission",
  },
  {
    host: "https://graphql.anilist.co/*",
    usedBy: "integrations/providers/anilist, widgets/anilist",
    reason: "Viewer profile, library, activity and inbox",
    access: "host-permission",
  },
  {
    host: "https://query1.finance.yahoo.com/*",
    usedBy: "widgets/stocks",
    reason: "Quotes, charts and symbol search",
    access: "host-permission",
  },
  {
    host: "https://query2.finance.yahoo.com/*",
    usedBy: "widgets/stocks",
    reason: "Fallback host for the same Yahoo endpoints",
    access: "host-permission",
  },
  {
    host: "https://trends.google.com/*",
    usedBy: "widgets/news",
    reason:
      "Google's own RSS export of Trending Now for the News widget's Trending tab (cookieless)",
    access: "host-permission",
  },
  {
    host: "https://news.google.com/*",
    usedBy: "widgets/news",
    reason: "Google News RSS, including topic and search feeds",
    access: "host-permission",
  },
  {
    host: "https://rss.nytimes.com/*",
    usedBy: "widgets/news",
    reason: "New York Times RSS",
    access: "host-permission",
  },
  {
    host: "https://feeds.bbci.co.uk/*",
    usedBy: "widgets/news",
    reason: "BBC RSS",
    access: "host-permission",
  },
  {
    host: "https://www.theguardian.com/*",
    usedBy: "widgets/news",
    reason: "Guardian RSS",
    access: "host-permission",
  },
  {
    host: "https://feeds.npr.org/*",
    usedBy: "widgets/news",
    reason: "NPR RSS",
    access: "host-permission",
  },
  {
    host: "https://news.yahoo.com/*",
    usedBy: "widgets/news",
    reason: "Yahoo News RSS",
    access: "host-permission",
  },
  {
    host: "https://site.api.espn.com/*",
    usedBy: "widgets/sports",
    reason: "Scoreboards and team lists per league; the teams route sends no CORS header",
    access: "host-permission",
  },
  {
    host: "https://cdn.espn.com/*",
    usedBy: "widgets/sports",
    reason: "Scoreboard mirror used when the primary host fails",
    access: "cors",
  },
  {
    host: "https://lux.hyunwk.me/*",
    usedBy: "feedback, integrations/providers/relay-provider",
    reason: "Feedback relay and confidential-client token exchange",
    access: "cors",
  },
];
