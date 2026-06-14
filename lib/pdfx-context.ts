import { createContext } from "react"
import { theme as defaultTheme } from "./theme-file"

type PdfxTheme = typeof defaultTheme

export const PdfxThemeContext = createContext<PdfxTheme>(defaultTheme)

export type { PdfxTheme }
