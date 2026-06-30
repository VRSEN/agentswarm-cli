import { describe, expect, test } from "bun:test"
import { readStartupAuthToken, stripStartupAuthToken } from "./startup-auth"

describe("readStartupAuthToken", () => {
  test("prefers hash auth_token over query auth_token", () => {
    expect(readStartupAuthToken({ hash: "#auth_token=hash-token", search: "?auth_token=query-token" })).toBe(
      "hash-token",
    )
  })

  test("uses query auth_token when hash has no auth_token", () => {
    expect(readStartupAuthToken({ hash: "#session=ses_123", search: "?auth_token=query-token" })).toBe("query-token")
  })
})

describe("stripStartupAuthToken", () => {
  test("removes auth_token from search and hash", () => {
    expect(
      stripStartupAuthToken({
        pathname: "/session",
        search: "?auth_token=query-token&keep=1",
        hash: "#auth_token=hash-token&section=main",
      }),
    ).toBe("/session?keep=1#section=main")
  })

  test("preserves an unrelated hash when only query auth_token is removed", () => {
    expect(
      stripStartupAuthToken({
        pathname: "/session",
        search: "?auth_token=query-token",
        hash: "#msg_123",
      }),
    ).toBe("/session#msg_123")
  })

  test("returns undefined when no startup auth_token exists", () => {
    expect(stripStartupAuthToken({ pathname: "/session", search: "?keep=1", hash: "#msg_123" })).toBeUndefined()
  })
})
