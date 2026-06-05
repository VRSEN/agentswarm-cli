import path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect } from "effect"
import { Flock } from "@opencode-ai/core/util/flock"

export function githubBaseUrl(root: string) {
  return pathToFileURL(root.endsWith(path.sep) ? root : `${root}${path.sep}`).href
}

export const githubBase = <A, E, R>(url: string, self: Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.promise((signal) => Flock.acquire("test:repo-clone-github-base-url", { signal })).pipe(
      Effect.map((lock) => {
        const previous = process.env.OPENCODE_REPO_CLONE_GITHUB_BASE_URL
        process.env.OPENCODE_REPO_CLONE_GITHUB_BASE_URL = url
        return { lock, previous }
      }),
    ),
    () => self,
    ({ lock, previous }) =>
      Effect.promise(async () => {
        if (previous) process.env.OPENCODE_REPO_CLONE_GITHUB_BASE_URL = previous
        else delete process.env.OPENCODE_REPO_CLONE_GITHUB_BASE_URL
        await lock.release()
      }).pipe(Effect.ignore),
  )
