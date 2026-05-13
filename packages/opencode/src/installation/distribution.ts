import { AgencyProduct } from "@/agency-swarm/product"

export namespace InstallationDistribution {
  export const packageName = AgencyProduct.profile === "openswarm" ? AgencyProduct.packageName : "agentswarm-cli"
  export const releaseRepo = AgencyProduct.releaseRepo
  export const installDir = ".opencode"
  export const installURL = `https://raw.githubusercontent.com/${releaseRepo}/dev/install`
  export const releasesURL = `https://github.com/${releaseRepo}/releases`
  export const docsURL = AgencyProduct.docs
}
