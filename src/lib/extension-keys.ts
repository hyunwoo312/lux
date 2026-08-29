import { z } from "zod";

export const ANILIST_CALLBACK_KEY = "lux:anilist-callback";
export const CHANGELOG_PENDING_KEY = "lux:changelog-pending";

export const anilistCallbackSchema = z
  .object({
    type: z.literal("anilist-oauth"),
    accessToken: z.string().optional(),
    tokenType: z.string().optional(),
    expiresIn: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  })
  .refine((callback) => callback.accessToken !== undefined || callback.error !== undefined);

export type AnilistCallback = z.infer<typeof anilistCallbackSchema>;
