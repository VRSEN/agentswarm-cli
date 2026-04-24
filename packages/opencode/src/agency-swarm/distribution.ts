import { AgencyProduct } from "./product"

export namespace AgencyDistribution {
  export const packageName = "agentswarm-cli"
  export const releaseRepo = "VRSEN/agentswarm-cli"
  export const installDir = ".opencode"
  export const installURL = `https://raw.githubusercontent.com/${releaseRepo}/dev/install`
  export const releasesURL = `https://github.com/${releaseRepo}/releases`
  export const docsURL = AgencyProduct.docs
}
