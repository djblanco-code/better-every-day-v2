import { describe, expect, it } from "vitest";
import { renderDoc, statementFor } from "./statement";

describe("renderDoc", () => {
  it("escapes HTML and renders the markdown subset", () => {
    const html = renderDoc("# Title\n\nSome **bold** and `code` <script>x</script>\n\n- a\n- b\n\nExample 1:\nInput: n = 2\n```\nprint(1)\n```");
    expect(html).toContain("<h3");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<ul");
    expect(html).toContain("Example 1:");
    expect(html).toContain("<pre");
    expect(html).not.toContain("<script>");
  });
});

describe("statementFor", () => {
  it("builds the debugging statement from symptom + script", () => {
    const s = statementFor("debugging", { id: "d", title: "t", symptom: "It breaks", prompt: "x = [] " }, {});
    expect(s.source).toBe("bank");
    expect(s.html).toContain("Symptom");
    expect(s.html).toContain("x = []");
  });
  it("falls back to premium wording, then to a link, for LeetCode", () => {
    const item = { id: "two-sum", title: "Two Sum", url: "https://leetcode.com/problems/two-sum/" };
    expect(statementFor("leetcode", item, { "two-sum": "Find two numbers." }).source).toBe("premium");
    expect(statementFor("leetcode", item, {}).source).toBe("none");
    expect(statementFor("leetcode", item, {}, "Given nums...").source).toBe("dataset");
  });
});
