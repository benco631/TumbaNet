export type AppEnv = "production" | "staging";

export const APP_ENV: AppEnv =
  process.env.APP_ENV === "staging" ? "staging" : "production";

export const IS_STAGING = APP_ENV === "staging";
export const IS_PRODUCTION = APP_ENV === "production";

export const TEAM_ALLOWED_EMAILS: readonly string[] = (
  process.env.TEAM_ALLOWED_EMAILS ?? ""
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedStagingEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return TEAM_ALLOWED_EMAILS.includes(email.toLowerCase());
}
