import { LocalContext } from "@/util/local-context"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import path from "path"
import type * as Project from "./project"

export interface InstanceContext {
  directory: string
  worktree: string
  project: Project.Info
}

export const context = LocalContext.create<InstanceContext>("instance")

/**
 * Check if a path is within the project boundary.
 * Returns true if path is inside ctx.directory OR ctx.worktree.
 * Paths within the worktree but outside the working directory should not trigger external_directory permission.
 */
export function containsPath(filepath: string, ctx: InstanceContext): boolean {
  const directory = AppFileSystem.normalizePath(ctx.directory)
  const worktree = AppFileSystem.normalizePath(ctx.worktree)
  const target = AppFileSystem.normalizePath(filepath)
  if (AppFileSystem.contains(directory, target)) return true
  // Non-git projects set worktree to a filesystem root, which would match ANY absolute path.
  // Skip worktree check in this case to preserve external_directory permissions.
  if (path.resolve(worktree) === path.resolve(path.parse(worktree).root)) return false
  return AppFileSystem.contains(worktree, target)
}
