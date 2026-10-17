/**
 * Whether this looks like a phone (not a tablet or desktop): the browser's
 * own mobile flag or a phone user agent, else a touch-only small screen for
 * browsers that hide both.
 */
export function isPhone(
  nav: Pick<Navigator, "userAgent"> & {
    userAgentData?: { mobile?: boolean };
  } = navigator,
  smallTouchScreen = typeof matchMedia === "function" &&
    matchMedia("(pointer: coarse) and (max-width: 767px)").matches,
): boolean {
  if (nav.userAgentData?.mobile) return true;
  const ua = nav.userAgent;
  if (/iPhone|iPod|Windows Phone|Android.*Mobile|Mobi/i.test(ua)) return true;
  if (/iPad|Android|Tablet/i.test(ua)) return false;
  return smallTouchScreen;
}
