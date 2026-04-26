import { z } from "zod";

export const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;
export const USERNAME_MIN_LEN = 3;
export const USERNAME_MAX_LEN = 30;

const lenMsg = `Use ${USERNAME_MIN_LEN}–${USERNAME_MAX_LEN} characters.`;

/** `handle` avoids DOM `name="username"`, which triggers login autofill. */
export const profileHandleFormSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(USERNAME_MIN_LEN, lenMsg)
    .max(USERNAME_MAX_LEN, lenMsg)
    .regex(
      USERNAME_RE,
      "Only letters, numbers, underscore, and period are allowed.",
    ),
});

export type ProfileHandleFormValues = z.infer<typeof profileHandleFormSchema>;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}
