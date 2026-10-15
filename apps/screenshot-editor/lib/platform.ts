/** True for macOS, iOS and iPadOS, where shortcuts use ⌘ instead of Ctrl. */
export function isApplePlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function currentPlatform(): string {
  if (typeof navigator === "undefined") return "";
  const withHints = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  return (
    withHints.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent
  );
}
