declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(location: string, options?: Record<string, unknown>)
    close(): void
    exec(sql: string): void
    prepare(sql: string): unknown
  }
}
