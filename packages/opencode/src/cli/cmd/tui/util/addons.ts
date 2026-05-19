import { mkdir, open, utimes } from "node:fs/promises"
import path from "node:path"
import { AgencyProduct } from "@/agency-swarm/product"

export async function requestProductAddonsSetup(
  env: Record<string, string | undefined> = process.env,
  profile: Pick<AgencyProduct.Profile, "addonsSetupFlagEnv"> = AgencyProduct,
) {
  const flagPath = AgencyProduct.addonsSetupFlagPath(env, profile)
  if (!flagPath) {
    throw new Error("Add-ons setup is not configured for this product.")
  }

  await mkdir(path.dirname(flagPath), { recursive: true })
  const file = await open(flagPath, "a")
  await file.close()
  const now = new Date()
  await utimes(flagPath, now, now)
}
