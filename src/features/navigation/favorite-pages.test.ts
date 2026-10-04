import { describe, expect, it } from "vitest"

import { parseFavoritePages, toggleFavoritePage } from "./favorite-pages"

describe("favorite pages", () => {
  it("loads only unique internal routes from saved data", () => {
    expect(parseFavoritePages(JSON.stringify(["/app/reports", "/app/reports", "//external.test", "/\\external"])))
      .toEqual(["/app/reports"])
  })

  it("tolerates malformed storage and toggles favorites immutably", () => {
    expect(parseFavoritePages("{bad json")).toEqual([])
    const paths = ["/app"]
    const added = toggleFavoritePage(paths, "/services")
    expect(added).toEqual(["/app", "/services"])
    expect(paths).toEqual(["/app"])
    expect(toggleFavoritePage(added, "/app")).toEqual(["/services"])
  })
})
