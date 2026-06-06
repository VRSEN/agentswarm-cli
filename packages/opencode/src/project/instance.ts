import { GlobalBus } from "@/bus/global"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import { disposeInstance } from "@/effect/instance-registry"
import { makeRuntime } from "@/effect/run-service"
import { iife } from "@/util/iife"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import * as Log from "@opencode-ai/core/util/log"
import { context, containsPath as contains, type InstanceContext } from "./instance-context"
import * as Project from "./project"

export type { InstanceContext } from "./instance-context"

const log = Log.create({ service: "instance" })
const cache = new Map<string, Promise<InstanceContext>>()
const project = makeRuntime(Project.Service, Project.defaultLayer)

const disposal = {
  all: undefined as Promise<void> | undefined,
}

function boot(input: { directory: string; init?: () => Promise<unknown>; worktree?: string; project?: Project.Info }) {
  return iife(async () => {
    const ctx =
      input.project && input.worktree
        ? {
            directory: input.directory,
            worktree: input.worktree,
            project: input.project,
          }
        : await project
            .runPromise((svc) => svc.fromDirectory(input.directory))
            .then(({ project, sandbox }) => ({
              directory: input.directory,
              worktree: sandbox,
              project,
            }))
    await context.provide(ctx, async () => {
      await input.init?.()
    })
    return ctx
  })
}

function track(directory: string, next: Promise<InstanceContext>) {
  const task = next.catch((err) => {
    if (cache.get(directory) === task) cache.delete(directory)
    throw err
  })
  cache.set(directory, task)
  return task
}

export const Instance = {
  async provide<R>(input: { directory: string; init?: () => Promise<unknown>; fn: () => R }): Promise<R> {
    const directory = AppFileSystem.resolve(input.directory)
    let existing = cache.get(directory)
    if (!existing) {
      log.info("creating instance", { directory })
      existing = track(
        directory,
        boot({
          directory,
          init: input.init,
        }),
      )
    }
    const ctx = await existing
    return context.provide(ctx, async () => input.fn())
  },
  get current() {
    return context.use()
  },
  get directory() {
    return context.use().directory
  },
  get worktree() {
    return context.use().worktree
  },
  get project() {
    return context.use().project
  },
  containsPath(filepath: string, ctx?: InstanceContext) {
    return contains(filepath, ctx ?? Instance.current)
  },

  /**
   * Captures the current instance ALS context and returns a wrapper that
   * restores it when called. Use this for callbacks that fire outside the
   * instance async context (native addons, event emitters, timers, etc.).
   */
  bind<F extends (...args: any[]) => any>(fn: F): F {
    const ctx = context.use()
    return ((...args: any[]) => context.provide(ctx, () => fn(...args))) as F
  },
  /**
   * Run a synchronous function within the given instance context ALS.
   * Use this to bridge from Effect (where InstanceRef carries context)
   * back to sync code that reads Instance.directory from ALS.
   */
  restore<R>(ctx: InstanceContext, fn: () => R): R {
    return context.provide(ctx, fn)
  },
  async reload(input: { directory: string; init?: () => Promise<unknown>; project?: Project.Info; worktree?: string }) {
    const directory = AppFileSystem.resolve(input.directory)
    log.info("reloading instance", { directory })
    await disposeInstance(directory)
    cache.delete(directory)
    const next = track(directory, boot({ ...input, directory }))

    GlobalBus.emit("event", {
      directory,
      project: input.project?.id,
      workspace: WorkspaceContext.workspaceID,
      payload: {
        type: "server.instance.disposed",
        properties: {
          directory,
        },
      },
    })

    return await next
  },
  async dispose() {
    const directory = Instance.directory
    const project = Instance.project
    log.info("disposing instance", { directory })
    await disposeInstance(directory)
    cache.delete(directory)

    GlobalBus.emit("event", {
      directory,
      project: project.id,
      workspace: WorkspaceContext.workspaceID,
      payload: {
        type: "server.instance.disposed",
        properties: {
          directory,
        },
      },
    })
  },
  async disposeAll() {
    if (disposal.all) return disposal.all

    disposal.all = iife(async () => {
      log.info("disposing all instances")
      const entries = [...cache.entries()]
      for (const [key, value] of entries) {
        if (cache.get(key) !== value) continue

        const ctx = await value.catch((err) => {
          log.warn("instance dispose failed", { key, error: err })
          return undefined
        })

        if (!ctx) {
          if (cache.get(key) === value) cache.delete(key)
          continue
        }

        if (cache.get(key) !== value) continue

        await context.provide(ctx, async () => {
          await Instance.dispose()
        })
      }
    }).finally(() => {
      disposal.all = undefined
    })

    return disposal.all
  },
}
