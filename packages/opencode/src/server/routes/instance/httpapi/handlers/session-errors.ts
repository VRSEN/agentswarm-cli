import type { NotFoundError as StorageNotFoundError } from "@/storage/storage"
import type { Session } from "@/session/session"
import { Effect } from "effect"
import { HttpApiError } from "effect/unstable/httpapi"
import * as ApiError from "../errors"

export function mapStorageNotFound<A, E, R>(self: Effect.Effect<A, StorageNotFoundError | E, R>) {
  return self.pipe(
    Effect.catchTag("NotFoundError", (error) => Effect.fail(ApiError.notFound((error as StorageNotFoundError).message))),
  )
}

export function mapBusy<A, E, R>(self: Effect.Effect<A, Session.BusyError | E, R>) {
  return self.pipe(Effect.catchTag("SessionBusyError", () => Effect.fail(new HttpApiError.BadRequest({}))))
}
