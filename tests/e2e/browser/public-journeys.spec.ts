import { expect, test } from "@playwright/test";

test.describe("public browser journeys", () => {
  test("trust centre handles unavailable metrics without fabricated numbers", async ({ page }) => {
    await page.route("**/api/intelligence/trust-metrics", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "unavailable",
          data: null,
          dataState: {
            availability: "unavailable",
            asOf: null,
            missingInputs: ["prediction_registry"],
            lineage: [],
          },
          asOf: null,
          lineage: [],
          missingInputs: ["prediction_registry"],
          isSynthetic: false,
          isFallback: false,
        }),
      });
    });

    await page.goto("/?page=trust");

    await expect(page.getByRole("heading", { name: "Trust Centre" })).toBeVisible();
    await expect(page.getByText("Data state: unavailable")).toBeVisible();
    await expect(page.getByText("Data unavailable").first()).toBeVisible();
    await expect(page.getByText("106,920")).toHaveCount(0);
    await expect(page.getByText("493,200")).toHaveCount(0);
    await expect(page.getByText(/Every prediction/i)).toHaveCount(0);
  });

  test("public rankings journey can open without backend auth", async ({ page }) => {
    await page.goto("/?page=rankings");

    await expect(page.locator("body")).toContainText(/rankings|stockstory/i);
  });
});
