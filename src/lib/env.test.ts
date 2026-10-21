import { describe, expect, it } from "vitest";
import { publicEnv } from "./env";

describe("publicEnv", () => {
  it("accepts a valid Supabase URL and key", () => {
    const e = publicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });
    expect(e.NEXT_PUBLIC_SUPABASE_URL).toContain("supabase.co");
  });
  it("rejects a missing key so a misconfigured deploy fails loudly", () => {
    expect(() => publicEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toThrow();
  });
});
