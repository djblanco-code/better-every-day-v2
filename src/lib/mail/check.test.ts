import { describe, expect, it } from "vitest";
import { classify, matchCompany } from "./check";

describe("mail classification", () => {
  it("recognises the four kinds, offer and rejection before the generic words", () => {
    expect(classify("Next steps with Acme", "We'd love to schedule a call to discuss your availability")).toBe("interview");
    expect(classify("Your HackerRank assessment", "Please complete within 5 days")).toBe("assessment");
    expect(classify("Update on your application", "Unfortunately we will not be moving forward")).toBe("rejection");
    expect(classify("Acme offer letter", "We are pleased to offer you the role; interview feedback was great")).toBe("offer");
    expect(classify("Lunch?", "Are you free Friday")).toBe("other");
  });
  it("matches a tracker company by sender domain, name or subject, preferring the longest hit", () => {
    const c = [{ id: "1", company: "Acme" }, { id: "2", company: "Acme Robotics" }, { id: "3", company: "IMC" }];
    expect(matchCompany(c, "recruiting@acmerobotics.com", "Sam", "Interview")?.id).toBe("2");
    expect(matchCompany(c, "hr@example.com", "Acme Talent", "Hello")?.id).toBe("1");
    expect(matchCompany(c, "x@y.com", "", "nothing here")).toBeNull();
    expect(matchCompany(c, "jobs@imc.com", "", "IMC assessment")).toBeNull();   // 3-letter names need 4+ letters to match
  });
});
