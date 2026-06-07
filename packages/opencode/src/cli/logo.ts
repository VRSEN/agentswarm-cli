export const logo = {
  left: [
    "                                            ",
    " █████╗  ██████╗ ███████╗███╗   ██╗████████╗",
    "██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝",
    "███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ",
    "██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ",
    "██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ",
    "╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ",
  ],
  right: [
    "",
    "███████╗██╗    ██╗ █████╗ ██████╗ ███╗   ███╗",
    "██╔════╝██║    ██║██╔══██╗██╔══██╗████╗ ████║",
    "███████╗██║ █╗ ██║███████║██████╔╝██╔████╔██║",
    "╚════██║██║███╗██║██╔══██║██╔══██╗██║╚██╔╝██║",
    "███████║╚███╔███╔╝██║  ██║██║  ██║██║ ╚═╝ ██║",
    "╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝",
  ],
}

export type LogoGlyph = {
  left: string[]
  right: string[]
}

export function rows(glyph: LogoGlyph = logo) {
  return Array.from({ length: Math.max(glyph.left.length, glyph.right.length) }, (_, index) =>
    `${glyph.left[index] ?? ""} ${glyph.right[index] ?? ""}`.trimEnd(),
  )
}

export function width(glyph: LogoGlyph = logo) {
  return Math.max(...rows(glyph).map((line) => line.length))
}

export const go = {
  left: ["    ", "█▀▀▀", "█_^█", "▀▀▀▀"],
  right: ["    ", "█▀▀█", "█__█", "▀▀▀▀"],
}

export const marks = "_^~,"
