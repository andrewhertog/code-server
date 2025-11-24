import { version } from "../../src/node/constants"
import { describe, test, expect } from "./baseFixture"

describe("Open Help > About", ["--disable-workspace-trust"], {}, () => {
  test("should see codex version in about dialog", async ({ codeServerPage }) => {
    // Open using the menu.
    await codeServerPage.navigateMenus(["Help", "About"])

    const isDevMode = process.env.VSCODE_DEV === "1"

    // Look for codex info div.
    const element = await codeServerPage.page.waitForSelector(
      `div[role="dialog"] >> text=codex: ${isDevMode ? "Unknown" : "v" + version}`,
    )
    expect(element).not.toBeNull()
  })
})
