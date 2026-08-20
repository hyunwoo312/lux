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
