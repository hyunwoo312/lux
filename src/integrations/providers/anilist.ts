import { IntegrationReconnectRequiredError } from "@/integrations/errors";
import { withTimeout } from "@/lib/abort";
import type {
  AcquireTokenParams,
  IntegrationProvider,
  IntegrationTokenResponse,
} from "@/integrations/types";

const AUTHORIZE_ENDPOINT = "https://anilist.co/api/v2/oauth/authorize";
const GRAPHQL_ENDPOINT = "https://graphql.anilist.co";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;
const CALLBACK_KEY = "lux:anilist-callback";

const VIEWER_QUERY = `query { Viewer { id name avatar { large } } }`;

type ViewerPayload = {
  data?: { Viewer?: { id: number; name: string; avatar?: { large?: string } } };
};

type AnilistCallback = {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: string;
  state?: string;
  error?: string;
};

async function readCallback(): Promise<AnilistCallback | null> {
  try {
    const stored = await chrome.storage.session.get(CALLBACK_KEY);
    return (stored[CALLBACK_KEY] as AnilistCallback | undefined) ?? null;
  } catch {
    return null;
  }
}

async function clearCallback(): Promise<void> {
  try {
    await chrome.storage.session.remove(CALLBACK_KEY);
  } catch {
    return;
  }
}

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
      chrome.storage.onChanged.removeListener(onStorageChanged);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      if (tabId !== undefined) void chrome.tabs.remove(tabId).catch(() => undefined);
      action();
    }

    function settleFrom(callback: AnilistCallback): boolean {
      if (!callback.state || callback.state !== state) return false;
      void clearCallback();

      const accessToken = callback.accessToken;
      if (callback.error || !accessToken) {
        finish(() => reject(new Error("AniList sign-in could not be completed")));
        return true;
      }

      const expiresIn = Number(callback.expiresIn);
      finish(() =>
        resolve({
          accessToken,
          expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : ONE_YEAR_SECONDS,
          tokenType: callback.tokenType || "Bearer",
          scopes: [],
        }),
      );
      return true;
    }

    function onStorageChanged(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName,
    ) {
      if (areaName !== "session") return;
      const next = changes[CALLBACK_KEY]?.newValue as AnilistCallback | undefined;
      if (next) settleFrom(next);
    }

    function onRemoved(closedTabId: number) {
      if (closedTabId !== tabId) return;
      void readCallback().then((callback) => {
        if (callback && settleFrom(callback)) return;
        finish(() => reject(new Error("AniList sign-in was cancelled")));
      });
    }

    chrome.storage.onChanged.addListener(onStorageChanged);
    chrome.tabs.onRemoved.addListener(onRemoved);

    void clearCallback()
      .then(() => chrome.tabs.create({ url: buildAuthorizeUrl(clientId, state) }))
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
      signal: withTimeout(),
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
