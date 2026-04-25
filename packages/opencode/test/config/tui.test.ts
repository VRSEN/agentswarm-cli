import { afterEach, beforeEach, expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Config } from "../../src/config/config"
import { TuiConfig } from "../../src/cli/cmd/tui/config/tui"
import { Global } from "../../src/global"
import { Filesystem } from "../../src/util/filesystem"
import { AgencyBrand } from "../../src/agency-swarm/brand"

const managedConfigDir = process.env.OPENCODE_TEST_MANAGED_CONFIG_DIR!
const wintest = process.platform === "win32" ? test : test.skip
const getTuiConfig = async (directory: string) =>
  Instance.provide({
    directory,
    fn: () => TuiConfig.get(),
  })

beforeEach(async () => {
  await Config.invalidate(true)
})

afterEach(async () => {
  delete process.env.OPENCODE_CONFIG
  delete process.env.OPENCODE_TUI_CONFIG
  await fs.rm(path.join(Global.Path.config, `${AgencyBrand.config}.json`), { force: true }).catch(() => {})
  await fs.rm(path.join(Global.Path.config, `${AgencyBrand.config}.jsonc`), { force: true }).catch(() => {})
  await fs.rm(path.join(Global.Path.config, "tui.json"), { force: true }).catch(() => {})
  await fs.rm(path.join(Global.Path.config, "tui.jsonc"), { force: true }).catch(() => {})
  await fs.rm(managedConfigDir, { force: true, recursive: true }).catch(() => {})
  await Config.invalidate(true)
})

test("keeps server and tui plugin merge semantics aligned", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      const local = path.join(dir, AgencyBrand.workspace)
      await fs.mkdir(local, { recursive: true })

      await Bun.write(
        path.join(Global.Path.config, `${AgencyBrand.config}.json`),
        JSON.stringify(
          {
            plugin: [["shared-plugin@1.0.0", { source: "global" }], "global-only@1.0.0"],
          },
          null,
          2,
        ),
      )
      await Bun.write(
        path.join(Global.Path.config, "tui.json"),
        JSON.stringify(
          {
            plugin: [["shared-plugin@1.0.0", { source: "global" }], "global-only@1.0.0"],
          },
          null,
          2,
        ),
      )

      await Bun.write(
        path.join(local, `${AgencyBrand.config}.json`),
        JSON.stringify(
          {
            plugin: [["shared-plugin@2.0.0", { source: "local" }], "local-only@1.0.0"],
          },
          null,
          2,
        ),
      )
      await Bun.write(
        path.join(local, "tui.json"),
        JSON.stringify(
          {
            plugin: [["shared-plugin@2.0.0", { source: "local" }], "local-only@1.0.0"],
          },
          null,
          2,
        ),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const server = await Config.get()
      const tui = await getTuiConfig(tmp.path)
      const serverPlugins = (server.plugin ?? []).map((item) => Config.pluginSpecifier(item))
      const tuiPlugins = (tui.plugin ?? []).map((item) => Config.pluginSpecifier(item))

      expect(serverPlugins).toEqual(tuiPlugins)
      expect(serverPlugins).toContain("shared-plugin@2.0.0")
      expect(serverPlugins).not.toContain("shared-plugin@1.0.0")

      const serverOrigins = server.plugin_origins ?? []
      const tuiOrigins = tui.plugin_origins ?? []
      expect(serverOrigins.map((item) => Config.pluginSpecifier(item.spec))).toEqual(serverPlugins)
      expect(tuiOrigins.map((item) => Config.pluginSpecifier(item.spec))).toEqual(tuiPlugins)
      expect(serverOrigins.map((item) => item.scope)).toEqual(tuiOrigins.map((item) => item.scope))
    },
  })
})

test("loads tui config with the same precedence order as server config paths", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(Global.Path.config, "tui.json"), JSON.stringify({ diff_style: "auto" }, null, 2))
      await Bun.write(path.join(dir, "tui.json"), JSON.stringify({ scroll_speed: 2 }, null, 2))
      await fs.mkdir(path.join(dir, AgencyBrand.workspace), { recursive: true })
      await Bun.write(
        path.join(dir, AgencyBrand.workspace, "tui.json"),
        JSON.stringify({ diff_style: "stacked" }, null, 2),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.scroll_speed).toBe(2)
      expect(config.diff_style).toBe("stacked")
    },
  })
})

test("migrates tui-specific keys from opencode.json when tui.json does not exist", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, `${AgencyBrand.config}.json`),
        JSON.stringify(
          {
            theme: "migrated-theme",
            tui: { scroll_speed: 5 },
            keybinds: { app_exit: "ctrl+q" },
          },
          null,
          2,
        ),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect("theme" in config).toBe(false)
      expect(config.scroll_speed).toBe(5)
      expect(config.keybinds?.app_exit).toBe("ctrl+q")
      const text = await Filesystem.readText(path.join(tmp.path, "tui.json"))
      expect(JSON.parse(text)).toMatchObject({
        scroll_speed: 5,
      })
      const server = JSON.parse(await Filesystem.readText(path.join(tmp.path, `${AgencyBrand.config}.json`)))
      expect(server.theme).toBeUndefined()
      expect(server.keybinds).toBeUndefined()
      expect(server.tui).toBeUndefined()
      expect(await Filesystem.exists(path.join(tmp.path, `${AgencyBrand.config}.json.tui-migration.bak`))).toBe(true)
      expect(await Filesystem.exists(path.join(tmp.path, "tui.json"))).toBe(true)
    },
  })
})

test("migrates project legacy tui keys even when global tui.json already exists", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(Global.Path.config, "tui.json"), JSON.stringify({ diff_style: "auto" }, null, 2))
      await Bun.write(
        path.join(dir, `${AgencyBrand.config}.json`),
        JSON.stringify(
          {
            theme: "project-migrated",
            tui: { scroll_speed: 2 },
          },
          null,
          2,
        ),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect("theme" in config).toBe(false)
      expect(config.scroll_speed).toBe(2)
      expect(await Filesystem.exists(path.join(tmp.path, "tui.json"))).toBe(true)

      const server = JSON.parse(await Filesystem.readText(path.join(tmp.path, `${AgencyBrand.config}.json`)))
      expect(server.theme).toBeUndefined()
      expect(server.tui).toBeUndefined()
    },
  })
})

test("drops unknown legacy tui keys during migration", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, `${AgencyBrand.config}.json`),
        JSON.stringify(
          {
            theme: "migrated-theme",
            tui: { scroll_speed: 2, foo: 1 },
          },
          null,
          2,
        ),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect("theme" in config).toBe(false)
      expect(config.scroll_speed).toBe(2)

      const text = await Filesystem.readText(path.join(tmp.path, "tui.json"))
      const migrated = JSON.parse(text)
      expect(migrated.scroll_speed).toBe(2)
      expect(migrated.foo).toBeUndefined()
    },
  })
})

test("skips migration when opencode.jsonc is syntactically invalid", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, `${AgencyBrand.config}.jsonc`),
        `{
  "theme": "broken-theme",
  "tui": { "scroll_speed": 2 }
  "username": "still-broken"
}`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect("theme" in config).toBe(false)
      expect(config.scroll_speed).toBeUndefined()
      expect(await Filesystem.exists(path.join(tmp.path, "tui.json"))).toBe(false)
      expect(await Filesystem.exists(path.join(tmp.path, `${AgencyBrand.config}.jsonc.tui-migration.bak`))).toBe(false)
      const source = await Filesystem.readText(path.join(tmp.path, `${AgencyBrand.config}.jsonc`))
      expect(source).toContain('"theme": "broken-theme"')
      expect(source).toContain('"tui": { "scroll_speed": 2 }')
    },
  })
})

test("skips migration when tui.json already exists", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, `${AgencyBrand.config}.json`), JSON.stringify({ theme: "legacy" }, null, 2))
      await Bun.write(path.join(dir, "tui.json"), JSON.stringify({ diff_style: "stacked" }, null, 2))
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.diff_style).toBe("stacked")
      expect("theme" in config).toBe(false)

      const server = JSON.parse(await Filesystem.readText(path.join(tmp.path, `${AgencyBrand.config}.json`)))
      expect(server.theme).toBeUndefined()
      expect(await Filesystem.exists(path.join(tmp.path, `${AgencyBrand.config}.json.tui-migration.bak`))).toBe(true)
    },
  })
})

test("continues loading tui config when legacy source cannot be stripped", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, `${AgencyBrand.config}.json`),
        JSON.stringify({ theme: "readonly-theme" }, null, 2),
      )
    },
  })

  const source = path.join(tmp.path, `${AgencyBrand.config}.json`)
  await fs.chmod(source, 0o444)

  try {
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const config = await getTuiConfig(tmp.path)
        expect("theme" in config).toBe(false)
        expect(await Filesystem.exists(path.join(tmp.path, "tui.json"))).toBe(false)

        const server = JSON.parse(await Filesystem.readText(source))
        expect(server.theme).toBe("readonly-theme")
      },
    })
  } finally {
    await fs.chmod(source, 0o644)
  }
})

test("migration backup preserves JSONC comments", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, `${AgencyBrand.config}.jsonc`),
        `{
  // top-level comment
  "theme": "jsonc-theme",
  "tui": {
    // nested comment
    "scroll_speed": 1.5
  }
}`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      await getTuiConfig(tmp.path)
      const backup = await Filesystem.readText(path.join(tmp.path, `${AgencyBrand.config}.jsonc.tui-migration.bak`))
      expect(backup).toContain("// top-level comment")
      expect(backup).toContain("// nested comment")
      expect(backup).toContain('"theme": "jsonc-theme"')
      expect(backup).toContain('"scroll_speed": 1.5')
    },
  })
})

test("migrates legacy tui keys across multiple opencode.json levels", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      const nested = path.join(dir, "apps", "client")
      await fs.mkdir(nested, { recursive: true })
      await Bun.write(path.join(dir, `${AgencyBrand.config}.json`), JSON.stringify({ theme: "root-theme" }, null, 2))
      await Bun.write(
        path.join(nested, `${AgencyBrand.config}.json`),
        JSON.stringify({ theme: "nested-theme" }, null, 2),
      )
    },
  })

  await Instance.provide({
    directory: path.join(tmp.path, "apps", "client"),
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect("theme" in config).toBe(false)
      expect(await Filesystem.exists(path.join(tmp.path, "tui.json"))).toBe(false)
      expect(await Filesystem.exists(path.join(tmp.path, "apps", "client", "tui.json"))).toBe(false)
    },
  })
})

test("flattens nested tui key inside tui.json", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "tui.json"),
        JSON.stringify({
          theme: "outer",
          tui: { scroll_speed: 3, diff_style: "stacked" },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.scroll_speed).toBe(3)
      expect(config.diff_style).toBe("stacked")
      expect("theme" in config).toBe(false)
    },
  })
})

test("top-level keys in tui.json take precedence over nested tui key", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "tui.json"),
        JSON.stringify({
          diff_style: "auto",
          tui: { diff_style: "stacked", scroll_speed: 2 },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.diff_style).toBe("auto")
      expect(config.scroll_speed).toBe(2)
    },
  })
})

test("project config takes precedence over OPENCODE_TUI_CONFIG (matches OPENCODE_CONFIG)", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "tui.json"), JSON.stringify({ diff_style: "auto" }))
      const custom = path.join(dir, "custom-tui.json")
      await Bun.write(custom, JSON.stringify({ diff_style: "stacked" }))
      process.env.OPENCODE_TUI_CONFIG = custom
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.diff_style).toBe("auto")
    },
  })
})

test("drops removed theme keybinds while preserving valid overrides", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(Global.Path.config, "tui.json"), JSON.stringify({ keybinds: { app_exit: "ctrl+q" } }))
      await Bun.write(
        path.join(dir, "tui.json"),
        JSON.stringify({ keybinds: { theme_list: "ctrl+k", status_view: "ctrl+k" } }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.keybinds?.app_exit).toBe("ctrl+q")
      expect(config.keybinds?.status_view).toBe("ctrl+k")
      expect("theme_list" in (config.keybinds ?? {})).toBe(false)
    },
  })
})

wintest("defaults Ctrl+Z to input undo on Windows", async () => {
  await using tmp = await tmpdir()

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.keybinds?.terminal_suspend).toBe("none")
      expect(config.keybinds?.input_undo).toBe("ctrl+z,ctrl+-,super+z")
    },
  })
})

wintest("keeps explicit input undo overrides on Windows", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "tui.json"), JSON.stringify({ keybinds: { input_undo: "ctrl+y" } }))
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.keybinds?.terminal_suspend).toBe("none")
      expect(config.keybinds?.input_undo).toBe("ctrl+y")
    },
  })
})

wintest("ignores terminal suspend bindings on Windows", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "tui.json"), JSON.stringify({ keybinds: { terminal_suspend: "alt+z" } }))
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.keybinds?.terminal_suspend).toBe("none")
      expect(config.keybinds?.input_undo).toBe("ctrl+z,ctrl+-,super+z")
    },
  })
})

test("OPENCODE_TUI_CONFIG provides settings when no project config exists", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      const custom = path.join(dir, "custom-tui.json")
      await Bun.write(custom, JSON.stringify({ diff_style: "stacked" }))
      process.env.OPENCODE_TUI_CONFIG = custom
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.diff_style).toBe("stacked")
    },
  })
})

test("does not derive tui path from OPENCODE_CONFIG", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      const customDir = path.join(dir, "custom")
      await fs.mkdir(customDir, { recursive: true })
      await Bun.write(path.join(customDir, `${AgencyBrand.config}.json`), JSON.stringify({ model: "test/model" }))
      await Bun.write(path.join(customDir, "tui.json"), JSON.stringify({ theme: "should-not-load" }))
      process.env.OPENCODE_CONFIG = path.join(customDir, `${AgencyBrand.config}.json`)
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect("theme" in config).toBe(false)
    },
  })
})

test("applies env and file substitutions in tui.json", async () => {
  const original = process.env.TUI_DIFF_TEST
  process.env.TUI_DIFF_TEST = "stacked"
  try {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "keybind.txt"), "ctrl+q")
        await Bun.write(
          path.join(dir, "tui.json"),
          JSON.stringify({
            diff_style: "{env:TUI_DIFF_TEST}",
            keybinds: { app_exit: "{file:keybind.txt}" },
          }),
        )
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const config = await getTuiConfig(tmp.path)
        expect(config.diff_style).toBe("stacked")
        expect(config.keybinds?.app_exit).toBe("ctrl+q")
      },
    })
  } finally {
    if (original === undefined) delete process.env.TUI_DIFF_TEST
    else process.env.TUI_DIFF_TEST = original
  }
})

test("applies file substitutions when first identical token is in a commented line", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "diff.txt"), "stacked")
      await Bun.write(
        path.join(dir, "tui.jsonc"),
        `{
  // "diff_style": "{file:diff.txt}",
  "diff_style": "{file:diff.txt}"
}`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.diff_style).toBe("stacked")
    },
  })
})

test("loads managed tui config and gives it highest precedence", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "tui.json"), JSON.stringify({ plugin: ["shared-plugin@1.0.0"] }, null, 2))
      await fs.mkdir(managedConfigDir, { recursive: true })
      await Bun.write(
        path.join(managedConfigDir, "tui.json"),
        JSON.stringify({ plugin: ["shared-plugin@2.0.0"] }, null, 2),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.plugin).toEqual(["shared-plugin@2.0.0"])
      expect(config.plugin_origins).toEqual([
        {
          spec: "shared-plugin@2.0.0",
          scope: "global",
          source: path.join(managedConfigDir, "tui.json"),
        },
      ])
    },
  })
})

test("loads workspace tui.json", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await fs.mkdir(path.join(dir, AgencyBrand.workspace), { recursive: true })
      await Bun.write(
        path.join(dir, AgencyBrand.workspace, "tui.json"),
        JSON.stringify({ diff_style: "stacked" }, null, 2),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.diff_style).toBe("stacked")
    },
  })
})

test("gracefully falls back when tui.json has invalid JSON", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "tui.json"), "{ invalid json }")
      await fs.mkdir(managedConfigDir, { recursive: true })
      await Bun.write(path.join(managedConfigDir, "tui.json"), JSON.stringify({ diff_style: "stacked" }, null, 2))
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.diff_style).toBe("stacked")
      expect(config.keybinds).toBeDefined()
    },
  })
})

test("supports tuple plugin specs with options in tui.json", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "tui.json"),
        JSON.stringify({
          plugin: [["acme-plugin@1.2.3", { enabled: true, label: "demo" }]],
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.plugin).toEqual([["acme-plugin@1.2.3", { enabled: true, label: "demo" }]])
      expect(config.plugin_origins).toEqual([
        {
          spec: ["acme-plugin@1.2.3", { enabled: true, label: "demo" }],
          scope: "local",
          source: path.join(tmp.path, "tui.json"),
        },
      ])
    },
  })
})

test("deduplicates tuple plugin specs by name with higher precedence winning", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(Global.Path.config, "tui.json"),
        JSON.stringify({
          plugin: [["acme-plugin@1.0.0", { source: "global" }]],
        }),
      )
      await Bun.write(
        path.join(dir, "tui.json"),
        JSON.stringify({
          plugin: [
            ["acme-plugin@2.0.0", { source: "project" }],
            ["second-plugin@3.0.0", { source: "project" }],
          ],
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.plugin).toEqual([
        ["acme-plugin@2.0.0", { source: "project" }],
        ["second-plugin@3.0.0", { source: "project" }],
      ])
      expect(config.plugin_origins).toEqual([
        {
          spec: ["acme-plugin@2.0.0", { source: "project" }],
          scope: "local",
          source: path.join(tmp.path, "tui.json"),
        },
        {
          spec: ["second-plugin@3.0.0", { source: "project" }],
          scope: "local",
          source: path.join(tmp.path, "tui.json"),
        },
      ])
    },
  })
})

test("tracks global and local plugin metadata in merged tui config", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(Global.Path.config, "tui.json"),
        JSON.stringify({
          plugin: ["global-plugin@1.0.0"],
        }),
      )
      await Bun.write(
        path.join(dir, "tui.json"),
        JSON.stringify({
          plugin: ["local-plugin@2.0.0"],
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.plugin).toEqual(["global-plugin@1.0.0", "local-plugin@2.0.0"])
      expect(config.plugin_origins).toEqual([
        {
          spec: "global-plugin@1.0.0",
          scope: "global",
          source: path.join(Global.Path.config, "tui.json"),
        },
        {
          spec: "local-plugin@2.0.0",
          scope: "local",
          source: path.join(tmp.path, "tui.json"),
        },
      ])
    },
  })
})

test("merges plugin_enabled flags across config layers", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(Global.Path.config, "tui.json"),
        JSON.stringify({
          plugin_enabled: {
            "internal:sidebar-context": false,
            "demo.plugin": true,
          },
        }),
      )
      await Bun.write(
        path.join(dir, "tui.json"),
        JSON.stringify({
          plugin_enabled: {
            "demo.plugin": false,
            "local.plugin": true,
          },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await getTuiConfig(tmp.path)
      expect(config.plugin_enabled).toEqual({
        "internal:sidebar-context": false,
        "demo.plugin": false,
        "local.plugin": true,
      })
    },
  })
})
