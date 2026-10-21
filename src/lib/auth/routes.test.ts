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
    expect(redirectFor("/", false)).toBeNull();
  });
  it("keeps a signed-in user off the sign-in page", () => {
    expect(redirectFor("/sign-in", true)).toBe("/today");
    expect(redirectFor("/today", true)).toBeNull();
  });
  it("never redirects to another origin after sign-in", () => {
    expect(safeNext("https://evil.example")).toBe("/today");
    expect(safeNext("//evil.example")).toBe("/today");
    expect(safeNext("/program")).toBe("/program");
    expect(safeNext(null)).toBe("/today");
  });
});
