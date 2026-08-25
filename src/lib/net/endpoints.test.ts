import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import manifestRaw from "@/../public/manifest.json?raw";
import { ENDPOINTS } from "@/lib/net";

const manifestHosts: string[] = (JSON.parse(manifestRaw) as { host_permissions: string[] })
  .host_permissions;

const declared = ENDPOINTS.filter((endpoint) => endpoint.access === "host-permission").map(
  (endpoint) => endpoint.host,
);

describe("endpoint registry parity with the manifest", () => {
  it("declares a host permission for every endpoint that needs one", () => {
    expect([...declared].sort()).toEqual([...manifestHosts].sort());
  });

  it("keeps no host permission the registry does not account for", () => {
    const unaccounted = manifestHosts.filter((host) => !declared.includes(host));
    expect(unaccounted).toEqual([]);
  });

  it("records why the CORS-only hosts need no permission", () => {
    const cors = ENDPOINTS.filter((endpoint) => endpoint.access === "cors");
    expect(cors.length).toBeGreaterThan(0);
    for (const endpoint of cors) {
      expect(manifestHosts).not.toContain(endpoint.host);
      expect(endpoint.reason).not.toBe("");
    }
  });

  it("has no duplicate hosts", () => {
    const hosts = ENDPOINTS.map((endpoint) => endpoint.host);
    expect(new Set(hosts).size).toBe(hosts.length);
  });
});

describe("endpoint registry parity with the code", () => {
  const SRC = fileURLToPath(new URL("../..", import.meta.url));

  function networkModules(): { file: string; body: string }[] {
    const found: { file: string; body: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.ts$/.test(entry) && !entry.includes(".test.")) {
          const body = readFileSync(full, "utf8");
          if (/\bfetch\(/.test(body)) found.push({ file: full, body });
        }
      }
    };
    walk(SRC);
    return found;
  }

  it("names every host the code actually reaches for", () => {
    const registered = ENDPOINTS.map((endpoint) =>
      endpoint.host.replace("https://", "").replace("/*", ""),
    );
    const strays: string[] = [];
    for (const { file, body } of networkModules()) {
      for (const match of body.matchAll(/https:\/\/([a-z0-9.-]+)/g)) {
        const host = match[1] ?? "";
        const known = registered.some((entry) => host === entry || host.endsWith(`.${entry}`));
        if (!known) strays.push(`${file.split(/[/\\]src[/\\]/)[1] ?? file}: ${host}`);
      }
    }
    expect([...new Set(strays)]).toEqual([]);
  });
});
