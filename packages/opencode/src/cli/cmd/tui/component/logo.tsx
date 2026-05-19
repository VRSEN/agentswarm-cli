import { TextAttributes, RGBA } from "@opentui/core"
import { For, type JSX } from "solid-js"
import { useTheme, tint } from "@tui/context/theme"
import { logo as defaultLogo, marks } from "@/cli/logo"
import { AgencyProduct } from "@/agency-swarm/product"

// Shadow markers (rendered chars in parens):
// _ = full shadow cell (space with bg=shadow)
// ^ = letter top, shadow bottom (▀ with fg=letter, bg=shadow)
// ~ = shadow top only (▀ with fg=shadow)
const SHADOW_MARKER = new RegExp(`[${marks}]`)

export function textLogo(product = AgencyProduct.resolve()) {
  return product.customBranding && !AgencyProduct.tuiLogo(product) ? product.name : undefined
}

export function tuiLogo(product = AgencyProduct.resolve()) {
  return AgencyProduct.tuiLogo(product)
}

export function Logo() {
  const { theme } = useTheme()
  const product = AgencyProduct.resolve()
  const custom = textLogo(product)
  const glyphLogo = tuiLogo(product) ?? defaultLogo
  const rows = Array.from({ length: Math.max(glyphLogo.left.length, glyphLogo.right.length) }, (_, index) => ({
    left: glyphLogo.left[index] ?? "",
    right: glyphLogo.right[index] ?? "",
  }))

  const renderLine = (line: string, fg: RGBA, bold: boolean): JSX.Element[] => {
    const shadow = tint(theme.background, fg, 0.25)
    const attrs = bold ? TextAttributes.BOLD : undefined
    const elements: JSX.Element[] = []
    let i = 0

    while (i < line.length) {
      const rest = line.slice(i)
      const markerIndex = rest.search(SHADOW_MARKER)

      if (markerIndex === -1) {
        elements.push(
          <text fg={fg} attributes={attrs} selectable={false}>
            {rest}
          </text>,
        )
        break
      }

      if (markerIndex > 0) {
        elements.push(
          <text fg={fg} attributes={attrs} selectable={false}>
            {rest.slice(0, markerIndex)}
          </text>,
        )
      }

      const marker = rest[markerIndex]
      switch (marker) {
        case "_":
          elements.push(
            <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
              {" "}
            </text>,
          )
          break
        case "^":
          elements.push(
            <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
              ▀
            </text>,
          )
          break
        case "~":
          elements.push(
            <text fg={shadow} attributes={attrs} selectable={false}>
              ▀
            </text>,
          )
          break
      }

      i += markerIndex + 1
    }

    return elements
  }

  if (custom) {
    return (
      <box>
        <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>
          {custom}
        </text>
      </box>
    )
  }

  return (
    <box>
      <For each={rows}>
        {(line) => (
          <box flexDirection="row" gap={1}>
            <box flexDirection="row">{renderLine(line.left, theme.secondary, false)}</box>
            <box flexDirection="row">{renderLine(line.right, theme.primary, true)}</box>
          </box>
        )}
      </For>
    </box>
  )
}
