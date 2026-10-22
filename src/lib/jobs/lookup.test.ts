import { describe, expect, it } from "vitest";
import { payIn } from "./lookup";

describe("payIn", () => {
  it("reads K bands and full-dollar bands", () => {
    expect(payIn("Base salary: $120K - $160K plus equity")).toBe("$120K-$160K");
    expect(payIn("<p>$140,000 to $185,000</p>")).toBe("$140K-$185K");
    expect(payIn("no pay here")).toBe("");
  });
});
