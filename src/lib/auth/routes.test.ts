import { describe, expect, it } from "vitest";
import { isProtected, redirectFor, safeNext } from "./routes";

describe("auth routes", () => {
  it("protects app pages and their children, not the landing page", () => {
    expect(isProtected("/today")).toBe(true);
    expect(isProtected("/settings/keys")).toBe(true);
    expect(isProtected("/")).toBe(false);
    expect(isProtected("/todayish")).toBe(false);
  });
  it("sends a signed-out visitor to sign-in with a return path", () => {
    expect(redirectFor("/today", false)).toBe("/sign-in?next=%2Ftoday");
    expect(redirectFor("/invite", false)).toBe("/sign-in?next=%2Finvite");
    expect(redirectFor("/", false)).toBeNull();
  });
  it("keeps a signed-in, invited user off the sign-in and invite pages", () => {
    expect(redirectFor("/sign-in", true)).toBe("/");
    expect(redirectFor("/invite", { signedIn: true, invited: true })).toBe("/");
    expect(redirectFor("/today", true)).toBeNull();
  });
  it("holds a signed-in but uninvited user at the invite page", () => {
    const v = { signedIn: true, invited: false };
    expect(redirectFor("/today", v)).toBe("/invite");
    expect(redirectFor("/settings", v)).toBe("/invite");
    expect(redirectFor("/invite", v)).toBeNull();
    expect(redirectFor("/sign-in", v)).toBe("/invite");
    expect(redirectFor("/", v)).toBeNull();
  });
  it("never redirects to another origin after sign-in", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/program")).toBe("/program");
    expect(safeNext(null)).toBe("/");
  });
});
