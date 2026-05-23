import { test as base } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

export const test = base.extend({
  page: async ({ page }, use) => {
    await installTauriMock(page);
    await page.addInitScript(() => {
      localStorage.setItem("aperio.language", "en");
      localStorage.removeItem("aperio.activeEnvironmentId");
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
