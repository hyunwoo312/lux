const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

const accessToken = params.get("access_token") ?? undefined;
const error = params.get("error") ?? undefined;

if (accessToken || error) {
  void chrome.runtime
    .sendMessage({
      type: "anilist-oauth",
      accessToken,
      tokenType: params.get("token_type") ?? undefined,
      expiresIn: params.get("expires_in") ?? undefined,
      state: params.get("state") ?? undefined,
      error,
    })
    .catch(() => {});
  window.history.replaceState(null, "", window.location.pathname);
}
