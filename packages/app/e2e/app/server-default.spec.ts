import { test, expect } from "../fixtures"
import { serverNamePattern, serverUrls } from "../utils"
import { closeDialog, clickMenuItem, openStatusPopover } from "../actions"

const DEFAULT_SERVER_URL_KEY = "opencode.settings.dat:defaultServerUrl"

test("can set a default server on web", async ({ page, gotoSession }) => {
  await page.addInitScript((key: string) => {
    try {
      localStorage.removeItem(key)
    } catch {
      return
    }
  }, DEFAULT_SERVER_URL_KEY)

  await gotoSession()

  const { popoverBody } = await openStatusPopover(page)
  await popoverBody.getByRole("button", { name: "Manage servers" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await expect(dialog.getByText(serverNamePattern).first()).toBeVisible()

  const menuTrigger = dialog.locator('[data-slot="dropdown-menu-trigger"]').first()
  await expect(menuTrigger).toBeVisible()
  await menuTrigger.click({ force: true })

  const menu = page.locator('[data-component="dropdown-menu-content"]').first()
  await expect(menu).toBeVisible()
  await clickMenuItem(menu, /set as default/i)

  await expect
    .poll(async () =>
      serverUrls.includes((await page.evaluate((key) => localStorage.getItem(key), DEFAULT_SERVER_URL_KEY)) ?? ""),
    )
    .toBe(true)
  await expect(dialog.getByText("Default", { exact: true })).toBeVisible()

  await closeDialog(page, dialog)

  const { popoverBody: reopened } = await openStatusPopover(page)

  const serverRow = reopened.locator("button").filter({ hasText: serverNamePattern }).first()
  await expect(serverRow).toBeVisible()
  await expect(serverRow.getByText("Default", { exact: true })).toBeVisible()
})
