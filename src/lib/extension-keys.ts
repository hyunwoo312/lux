import { z } from "zod";

export const ANILIST_CALLBACK_KEY = "lux:anilist-callback";
export const CHANGELOG_PENDING_KEY = "lux:changelog-pending";

export const OPEN_PALETTE_COMMAND = "open-palette";
export const PALETTE_PARAM = "palette";

export const openPaletteMessageSchema = z.object({
  type: z.literal("open-palette"),
  activeTabId: z.number(),
});

export type OpenPaletteMessage = z.infer<typeof openPaletteMessageSchema>;

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
