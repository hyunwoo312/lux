import { useEffect, useState } from "react";
import { z } from "zod";
import { ensureOk, parseResponse, withTimeout } from "@/lib/net";
import { read, write } from "@/lib/storage";

const GITHUB_API = "https://api.github.com/repos/hyunwoo312/lux";
const CACHE_KEY = "github-stars";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const repoSchema = z.object({ stargazers_count: z.number() });
const cacheSchema = z.object({ count: z.number(), at: z.number() });

export function useGithubStars(): number | null {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const cached = await read(CACHE_KEY, cacheSchema.nullable(), null);
      if (controller.signal.aborted) return;
      if (cached) setStars(cached.count);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) return;

      try {
        const response = await fetch(GITHUB_API, { signal: withTimeout(controller.signal) });
        ensureOk(response, "GitHub repository request failed");
        const { stargazers_count: count } = parseResponse(
          "GitHub repo",
          repoSchema,
          await response.json(),
        );
        setStars(count);
        await write(CACHE_KEY, { count, at: Date.now() });
      } catch {
        return;
      }
    })();

    return () => controller.abort();
  }, []);

  return stars;
}
