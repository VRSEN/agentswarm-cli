const contains = (consoleManagedProviders: string[] | ReadonlySet<string>, providerID: string) =>
  Array.isArray(consoleManagedProviders)
    ? consoleManagedProviders.includes(providerID)
    : consoleManagedProviders.has(providerID)

export const isConsoleManagedProvider = (consoleManagedProviders: string[] | ReadonlySet<string>, providerID: string) =>
  contains(consoleManagedProviders, providerID)

export const CONSOLE_MANAGED_ICON = "◆"

export const consoleManagedProviderLabel = (
  consoleManagedProviders: string[] | ReadonlySet<string>,
  providerID: string,
  name: string,
) => (isConsoleManagedProvider(consoleManagedProviders, providerID) ? `${CONSOLE_MANAGED_ICON} ${name}` : name)
