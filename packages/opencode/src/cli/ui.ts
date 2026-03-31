import z from "zod"
import { EOL } from "os"
import { NamedError } from "@opencode-ai/util/error"
import { logo as glyphs } from "./logo"

export namespace UI {
  export const CancelledError = NamedError.create("UICancelledError", z.void())
  const blue = "\x1b[38;2;90;112;180m"
  const blueBold = "\x1b[38;2;90;112;180m\x1b[1m"
  const gold = "\x1b[38;2;252;213;59m"
  const goldBold = "\x1b[38;2;252;213;59m\x1b[1m"
  const dim = "\x1b[38;2;123;125;141m"
  const dimBold = "\x1b[38;2;123;125;141m\x1b[1m"

  export const Style = {
    TEXT_HIGHLIGHT: gold,
    TEXT_HIGHLIGHT_BOLD: goldBold,
    TEXT_DIM: dim,
    TEXT_DIM_BOLD: dimBold,
    TEXT_NORMAL: "\x1b[0m",
    TEXT_NORMAL_BOLD: "\x1b[1m",
    TEXT_WARNING: gold,
    TEXT_WARNING_BOLD: goldBold,
    TEXT_DANGER: "\x1b[91m",
    TEXT_DANGER_BOLD: "\x1b[91m\x1b[1m",
    TEXT_SUCCESS: "\x1b[92m",
    TEXT_SUCCESS_BOLD: "\x1b[92m\x1b[1m",
    TEXT_INFO: blue,
    TEXT_INFO_BOLD: blueBold,
  }

  export function println(...message: string[]) {
    print(...message)
    Bun.stderr.write(EOL)
  }

  export function print(...message: string[]) {
    blank = false
    Bun.stderr.write(message.join(" "))
  }

  let blank = false
  export function empty() {
    if (blank) return
    println("" + Style.TEXT_NORMAL)
    blank = true
  }

  export function logo(pad?: string) {
    const result: string[] = []
    const reset = "\x1b[0m"
    const left = {
      fg: blue,
      shadow: "\x1b[38;2;35;39;64m",
      bg: "\x1b[48;2;35;39;64m",
    }
    const right = {
      fg: goldBold,
      shadow: "\x1b[38;2;212;153;52m",
      bg: "\x1b[48;2;212;153;52m",
    }
    const gap = " "
    const draw = (line: string, fg: string, shadow: string, bg: string) => {
      const parts: string[] = []
      for (const char of line) {
        if (char === "_") {
          parts.push(bg, " ", reset)
          continue
        }
        if (char === "^") {
          parts.push(fg, bg, "▀", reset)
          continue
        }
        if (char === "~") {
          parts.push(shadow, "▀", reset)
          continue
        }
        if (char === " ") {
          parts.push(" ")
          continue
        }
        parts.push(fg, char, reset)
      }
      return parts.join("")
    }
    glyphs.left.forEach((row, index) => {
      if (pad) result.push(pad)
      result.push(draw(row, left.fg, left.shadow, left.bg))
      result.push(gap)
      const other = glyphs.right[index] ?? ""
      result.push(draw(other, right.fg, right.shadow, right.bg))
      result.push(EOL)
    })
    return result.join("").trimEnd()
  }

  export async function input(prompt: string): Promise<string> {
    const readline = require("readline")
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    return new Promise((resolve) => {
      rl.question(prompt, (answer: string) => {
        rl.close()
        resolve(answer.trim())
      })
    })
  }

  export function error(message: string) {
    if (message.startsWith("Error: ")) {
      message = message.slice("Error: ".length)
    }
    println(Style.TEXT_DANGER_BOLD + "Error: " + Style.TEXT_NORMAL + message)
  }

  export function markdown(text: string): string {
    return text
  }
}
