import * as Locale from "@/util/locale"

export function displayAgentName(name: string) {
  if (name === "build") return "Agent Builder"
  return Locale.titlecase(name)
}
