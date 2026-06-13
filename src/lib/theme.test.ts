import { describe, expect, it } from "vitest";
import { getStoredTheme, setTheme } from "./theme";

describe("theme", () => {
  it("defaults to dark when nothing is stored", () => {
    localStorage.removeItem("aperio.theme");
    expect(getStoredTheme()).toBe("dark");
  });

  it("persists light theme selection", () => {
    setTheme("light");
    expect(getStoredTheme()).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    setTheme("dark");
  });
});
