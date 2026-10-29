/** Twitch tags are supplied by tmi.js, never by a viewer's message text. */
export function isModerator(tags: {
  mod?: boolean;
  badges?: Record<string, string | undefined> | null;
}): boolean {
  return tags.mod === true || tags.badges?.broadcaster === "1";
}
export function isKillCommand(text: string, authorized: boolean): boolean {
  return authorized && /^!understudy\s+stop\s*$/i.test(text.trim());
}
