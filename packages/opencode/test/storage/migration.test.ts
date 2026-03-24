import { expect, test } from "bun:test"
import path from "path"
import { read } from "../../src/storage/migration"
import { tmpdir } from "../fixture/fixture"

test("read preserves migration names for drizzle bookkeeping", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      const root = path.join(dir, "migration")
      const one = path.join(root, "20260101010203_first")
      const two = path.join(root, "20260102030405_second")
      await Bun.$`mkdir -p ${one} ${two}`.quiet()
      await Bun.write(path.join(one, "migration.sql"), "create table a(id text);")
      await Bun.write(path.join(two, "migration.sql"), "create table b(id text);")
      return root
    },
  })

  const journal = read(tmp.extra)

  expect(journal.map((item) => item.name)).toEqual(["20260101010203_first", "20260102030405_second"])
  expect(journal.map((item) => item.timestamp)).toEqual([Date.UTC(2026, 0, 1, 1, 2, 3), Date.UTC(2026, 0, 2, 3, 4, 5)])
})
