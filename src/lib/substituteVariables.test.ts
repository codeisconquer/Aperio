import { describe, expect, it } from "vitest";
import { urlToTemplateForm } from "./substituteVariables";

describe("urlToTemplateForm", () => {
  it("rewrites resolved base URL back to {{base_url}}", () => {
    expect(
      urlToTemplateForm("http://localhost:5510/api/submit", {
        base_url: "http://localhost:5510",
      }),
    ).toBe("{{base_url}}/api/submit");
  });

  it("leaves template URLs unchanged", () => {
    expect(
      urlToTemplateForm("{{base_url}}/api/submit", {
        base_url: "http://localhost:5510",
      }),
    ).toBe("{{base_url}}/api/submit");
  });
});
