import { test, expect } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Command } from "../../src/command"
import { Agent } from "../../src/agent/agent"

const root = path.join(__dirname, "../..")

test("repo no longer exposes removed opencode commands or docs mode", async () => {
  await Instance.provide({
    directory: root,
    fn: async () => {
      const commands = await Command.list().then((items) => items.map((item) => item.name))
      const agents = await Agent.list().then((items) => items.map((item) => item.name))

      expect(commands).not.toContain("commit")
      expect(commands).not.toContain("issues")
      expect(agents).not.toContain("docs")
    },
  })
})
