import { IntegrationReconnectRequiredError } from "@/integrations/errors";
import type {
  AcquireTokenParams,
  IntegrationProvider,
  IntegrationTokenResponse,
} from "@/integrations/types";

const AUTHORIZE_ENDPOINT = "https://anilist.co/api/v2/oauth/authorize";
const GRAPHQL_ENDPOINT = "https://graphql.anilist.co";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

const VIEWER_QUERY = `query { Viewer { id name avatar { large } } }`;

type ViewerPayload = {
  data?: { Viewer?: { id: number; name: string; avatar?: { large?: string } } };
};

type AnilistCallbackMessage = {
  type: "anilist-oauth";
  accessToken?: string;
  tokenType?: string;
  expiresIn?: string;
  state?: string;
  error?: string;
};

function buildAuthorizeUrl(clientId: string, state: string): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("state", state);
  return url.toString();
}

function acquireToken({
  clientId,
  state,
  interactive,
}: AcquireTokenParams): Promise<IntegrationTokenResponse> {
  if (!interactive) {
    return Promise.reject(
      new IntegrationReconnectRequiredError("AniList needs to be reconnected"),
    );
  }

  return new Promise((resolve, reject) => {
    let tabId: number | undefined;
    let settled = false;

    const timer = setTimeout(
      () => finish(() => reject(new Error("AniList sign-in timed out"))),
      SIGN_IN_TIMEOUT_MS,
    );

    function finish(action: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      if (tabId !== undefined) void chrome.tabs.remove(tabId).catch(() => undefined);
      action();
    }

    function onMessage(message: unknown, sender: chrome.runtime.MessageSender) {
      const data = message as AnilistCallbackMessage;
      if (data?.type !== "anilist-oauth") return;
      if (sender.tab?.id === undefined || sender.tab.id !== tabId) return;
      if (!data.state || data.state !== state) return;

      const accessToken = data.accessToken;
      if (data.error || !accessToken) {
        finish(() => reject(new Error("AniList sign-in could not be completed")));
        return;
      }

      const expiresIn = Number(data.expiresIn);
      finish(() =>
        resolve({
          accessToken,
          expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : ONE_YEAR_SECONDS,
          tokenType: data.tokenType || "Bearer",
          scopes: [],
        }),
      );
    }

    function onRemoved(closedTabId: number) {
      if (closedTabId === tabId) finish(() => reject(new Error("AniList sign-in was cancelled")));
    }

    chrome.runtime.onMessage.addListener(onMessage);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs
      .create({ url: buildAuthorizeUrl(clientId, state) })
      .then((tab) => {
        tabId = tab.id;
      })
      .catch((cause) =>
        finish(() =>
          reject(cause instanceof Error ? cause : new Error("Could not open AniList sign-in")),
        ),
      );
  });
}

export const anilistProvider: IntegrationProvider = {
  id: "anilist",
  label: "AniList",
  scopes: [],
  clientIdEnvKey: "VITE_ANILIST_CLIENT_ID",
  acquireToken,
  fetchProfile: async (accessToken) => {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: VIEWER_QUERY }),
    });

    if (!response.ok) {
      throw new Error("AniList profile request failed");
    }

    const viewer = ((await response.json()) as ViewerPayload).data?.Viewer;
    if (!viewer) {
      throw new Error("Unexpected AniList profile response");
    }

    return {
      providerAccountId: String(viewer.id),
      displayName: viewer.name,
      avatarUrl: viewer.avatar?.large,
    };
  },
};
