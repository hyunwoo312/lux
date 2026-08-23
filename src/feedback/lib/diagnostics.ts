import type { Diagnostics } from "@/feedback/types";

type BrowserName = "Brave" | "Edge" | "Opera" | "Chrome" | "Unknown";

export function parseBrowser(userAgent: string, isBrave: boolean): string {
  const version = /(?:Chrome|Chromium)\/(\d+)/.exec(userAgent)?.[1];
  let name: BrowserName = "Unknown";
  if (isBrave) name = "Brave";
  else if (/\bEdg\//.test(userAgent)) name = "Edge";
  else if (/\bOPR\//.test(userAgent)) name = "Opera";
  else if (/\bChrome\//.test(userAgent)) name = "Chrome";
  return version && name !== "Unknown" ? `${name} ${version}` : name;
}

export function parseOs(userAgent: string): string {
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/CrOS/.test(userAgent)) return "ChromeOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Unknown";
}

export function buildDiagnostics(input: {
  version: string;
  userAgent: string;
  isBrave: boolean;
  widgetTypes: readonly string[];
  connectedProviders: readonly string[];
}): Diagnostics {
  return {
    version: input.version,
    browser: parseBrowser(input.userAgent, input.isBrave),
    os: parseOs(input.userAgent),
    widgets: [...new Set(input.widgetTypes)].sort(),
    providers: [...new Set(input.connectedProviders)].sort(),
  };
}

export function describeDiagnostics(diagnostics: Diagnostics): [string, string][] {
  return [
    ["Lux version", diagnostics.version],
    ["Browser", diagnostics.browser],
    ["Operating system", diagnostics.os],
    ["Widgets in use", diagnostics.widgets.join(", ") || "none"],
    ["Accounts connected", diagnostics.providers.join(", ") || "none"],
  ];
}
