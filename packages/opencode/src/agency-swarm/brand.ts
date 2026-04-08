import { AgencyProduct } from "./product"

export namespace AgencyBrand {
  export const id = AgencyProduct.cmd
  export const cmd = AgencyProduct.cmd
  export const workspace = `.${id}`
  export const config = id
  export const configFiles = [`${config}.jsonc`, `${config}.json`] as const
}
