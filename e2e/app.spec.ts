import { test, expect } from "./fixtures";

const TEST_CURL = `curl -X POST 'https://httpbin.org/post' -H 'Content-Type: application/json' -d '{"hello":"world"}'`;

test.describe("Aperio desktop UI", () => {
  test("three-column layout, cURL import, and send response", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByTestId("layout-sidebar");
    const builder = page.getByTestId("layout-builder");
    const response = page.getByTestId("layout-response");

    await expect(sidebar).toBeVisible();
    await expect(builder).toBeVisible();
    await expect(response).toBeVisible();

    await expect(sidebar).toHaveAttribute("class", /border-r/);
    await expect(response).toHaveAttribute("class", /border-l/);

    await page.getByRole("button", { name: "Import cURL" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByTestId("curl-import-input").fill(TEST_CURL);
    await page.getByRole("button", { name: "Import", exact: true }).click();

    await expect(page.getByRole("dialog")).toBeHidden();

    await expect(page.locator("#http-method")).toHaveValue("POST");
    await expect(page.locator("#request-url")).toHaveValue(
      "https://httpbin.org/post",
    );

    const headerKey = page
      .getByTestId("layout-builder")
      .locator('input[value="Content-Type"]');
    await expect(headerKey).toBeVisible();
    await expect(
      page.getByTestId("layout-builder").locator('input[value="application/json"]'),
    ).toBeVisible();

    await expect(page.getByTestId("response-empty")).toBeVisible();

    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByTestId("response-status")).toHaveText("200", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("response-duration")).toContainText("42");
    await expect(page.getByTestId("response-empty")).toBeHidden();
  });
});
