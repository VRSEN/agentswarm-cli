import { AgencyProduct } from "./product"

export namespace AgencyBrand {
  export const id = AgencyProduct.cmd
  export const cmd = AgencyProduct.cmd
  export const workspace = `.${id}`
  export const legacyWorkspace = ".opencode"
  export const config = id
  export const legacyConfig = "opencode"
  export const configFiles = [`${config}.json`, `${config}.jsonc`] as const
  export const legacyConfigFiles = [`${legacyConfig}.json`, `${legacyConfig}.jsonc`] as const
  export const configFilesPreferred = [...configFiles].reverse() as readonly string[]
}
