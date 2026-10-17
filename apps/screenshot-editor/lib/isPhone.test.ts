import { describe, expect, it } from "vitest";
import { isPhone } from "./isPhone";

const ua = (userAgent: string) => ({ userAgent });

describe("isPhone", () => {
  it("trusts the browser's mobile flag", () => {
    expect(
      isPhone({ userAgent: "", userAgentData: { mobile: true } }, false),
    ).toBe(true);
  });
  it("spots phones from the user agent", () => {
    expect(
      isPhone(
        ua("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"),
        false,
      ),
    ).toBe(true);
    expect(
      isPhone(
        ua("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari"),
        false,
      ),
    ).toBe(true);
  });
  it("leaves tablets and desktops alone", () => {
    expect(
      isPhone(ua("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)"), true),
    ).toBe(false);
    expect(
      isPhone(ua("Mozilla/5.0 (Linux; Android 15; SM-X910) Safari"), true),
    ).toBe(false);
    expect(
      isPhone(ua("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), false),
    ).toBe(false);
  });
  it("falls back to a small touch screen", () => {
    expect(isPhone(ua("Mozilla/5.0 (X11; Linux x86_64)"), true)).toBe(true);
  });
});
