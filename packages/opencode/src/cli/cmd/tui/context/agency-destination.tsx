import { createSignal } from "solid-js"
import { createSimpleContext } from "./helper"

export const { use: useAgencyDestination, provider: AgencyDestinationProvider } = createSimpleContext({
  name: "AgencyDestination",
  init: () => {
    const [state, setState] = createSignal<"idle" | "discovering" | "selecting">("idle")

    return {
      state,
      pending() {
        return state() !== "idle"
      },
      message() {
        if (state() === "discovering") return "Discovering Agency Swarm servers..."
        if (state() === "selecting") return "Select an Agency Swarm server before sending your first message."
        return ""
      },
      discovering() {
        setState("discovering")
      },
      selecting() {
        setState("selecting")
      },
      ready() {
        setState("idle")
      },
    }
  },
})
