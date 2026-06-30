const AUTH_TOKEN_PARAM = "auth_token"

type StartupAuthLocation = Pick<Location, "hash" | "pathname" | "search">

const readHashAuthToken = (hash: string) => {
  if (!hash) return null
  return new URLSearchParams(hash.slice(1)).get(AUTH_TOKEN_PARAM)
}

export const readStartupAuthToken = (location: Pick<StartupAuthLocation, "hash" | "search">) => {
  const hash = readHashAuthToken(location.hash)
  if (hash) return hash
  return new URLSearchParams(location.search).get(AUTH_TOKEN_PARAM)
}

export const stripStartupAuthToken = (location: StartupAuthLocation) => {
  const params = new URLSearchParams(location.search)
  const hadSearch = params.has(AUTH_TOKEN_PARAM)
  params.delete(AUTH_TOKEN_PARAM)

  const hashParams = new URLSearchParams(location.hash.slice(1))
  const hadHash = hashParams.has(AUTH_TOKEN_PARAM)
  hashParams.delete(AUTH_TOKEN_PARAM)

  if (!hadSearch && !hadHash) return
  const search = params.size ? `?${params}` : ""
  const hash = hadHash ? (hashParams.size ? `#${hashParams}` : "") : location.hash
  return `${location.pathname}${search}${hash}`
}
