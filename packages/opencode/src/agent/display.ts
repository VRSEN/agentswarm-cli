import * as Locale from "@/util/locale"

export function displayAgentName(name: string) {
  return Locale.titlecase(name)
}
