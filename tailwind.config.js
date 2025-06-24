import { heroui } from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui({
    "themes": {
      "light": {
        "colors": {
          "default": {
            "50": "#f0eff8",
            "100": "#dcd8ee",
            "200": "#c7c1e3",
            "300": "#b2aad9",
            "400": "#9e93cf",
            "500": "#897cc5",
            "600": "#7166a3",
            "700": "#595180",
            "800": "#413b5e",
            "900": "#29253b",
            "foreground": "#000",
            "DEFAULT": "#897cc5"
          },
          "primary": {
            "50": "#eee4f8",
            "100": "#d7bfef",
            "200": "#bf99e5",
            "300": "#a773db",
            "400": "#904ed2",
            "500": "#7828c8",
            "600": "#6321a5",
            "700": "#4e1a82",
            "800": "#39135f",
            "900": "#240c3c",
            "foreground": "#fff",
            "DEFAULT": "#7828c8"
          },
          "secondary": {
            "50": "#e9edff",
            "100": "#cbd4ff",
            "200": "#adbcff",
            "300": "#8fa3ff",
            "400": "#708aff",
            "500": "#5271ff",
            "600": "#445dd2",
            "700": "#3549a6",
            "800": "#273679",
            "900": "#19224d",
            "foreground": "#000",
            "DEFAULT": "#5271ff"
          },
          "success": {
            "50": "#e3f8ef",
            "100": "#bbedd8",
            "200": "#93e3c1",
            "300": "#6bd9ab",
            "400": "#43ce94",
            "500": "#1bc47d",
            "600": "#16a267",
            "700": "#127f51",
            "800": "#0d5d3b",
            "900": "#083b26",
            "foreground": "#000",
            "DEFAULT": "#1bc47d"
          },
          "warning": {
            "50": "#fff5df",
            "100": "#ffe8b3",
            "200": "#ffda86",
            "300": "#ffcc59",
            "400": "#ffbf2d",
            "500": "#ffb100",
            "600": "#d29200",
            "700": "#a67300",
            "800": "#795400",
            "900": "#4d3500",
            "foreground": "#000",
            "DEFAULT": "#ffb100"
          },
          "danger": {
            "50": "#ffe9e9",
            "100": "#ffcaca",
            "200": "#ffabab",
            "300": "#ff8d8d",
            "400": "#ff6e6e",
            "500": "#ff4f4f",
            "600": "#d24141",
            "700": "#a63333",
            "800": "#792626",
            "900": "#4d1818",
            "foreground": "#000",
            "DEFAULT": "#ff4f4f"
          },
          "background": "#f9f7fd",
          "foreground": "#4a3d77",
          "content1": {
            "DEFAULT": "#f2e8ff",
            "foreground": "#000"
          },
          "content2": {
            "DEFAULT": "#e8daff",
            "foreground": "#000"
          },
          "content3": {
            "DEFAULT": "#dccbff",
            "foreground": "#000"
          },
          "content4": {
            "DEFAULT": "#cfbcff",
            "foreground": "#000"
          },
          "focus": "#7828c8",
          "overlay": "#000000"
        }
      },
      "dark": {
        "colors": {
          "default": {
            "50": "#e4e3e6",
            "100": "#bfbcc2",
            "200": "#99969f",
            "300": "#736f7c",
            "400": "#4e4858",
            "500": "#282135",
            "600": "#211b2c",
            "700": "#1a1522",
            "800": "#131019",
            "900": "#0c0a10",
            "foreground": "#fff",
            "DEFAULT": "#282135"
          },
          "primary": {
            "50": "#f2eafa",
            "100": "#dfcbf2",
            "200": "#ccadea",
            "300": "#b98fe2",
            "400": "#a671db",
            "500": "#9353d3",
            "600": "#7944ae",
            "700": "#603689",
            "800": "#462764",
            "900": "#2c193f",
            "foreground": "#fff",
            "DEFAULT": "#9353d3"
          },
          "secondary": {
            "50": "#eceeff",
            "100": "#d0d7ff",
            "200": "#b5c0ff",
            "300": "#9aa9ff",
            "400": "#7e91ff",
            "500": "#637aff",
            "600": "#5265d2",
            "700": "#404fa6",
            "800": "#2f3a79",
            "900": "#1e254d",
            "foreground": "#000",
            "DEFAULT": "#637aff"
          },
          "success": {
            "50": "#e4faf1",
            "100": "#bdf4dd",
            "200": "#97edc9",
            "300": "#70e6b5",
            "400": "#4ae0a1",
            "500": "#23d98d",
            "600": "#1db374",
            "700": "#178d5c",
            "800": "#116743",
            "900": "#0b412a",
            "foreground": "#000",
            "DEFAULT": "#23d98d"
          },
          "warning": {
            "50": "#fff8e6",
            "100": "#ffefc4",
            "200": "#ffe6a1",
            "300": "#ffdd7f",
            "400": "#ffd35c",
            "500": "#ffca3a",
            "600": "#d2a730",
            "700": "#a68326",
            "800": "#79601c",
            "900": "#4d3d11",
            "foreground": "#000",
            "DEFAULT": "#ffca3a"
          },
          "danger": {
            "50": "#ffeded",
            "100": "#ffd3d3",
            "200": "#ffb9b9",
            "300": "#ff9f9f",
            "400": "#ff8585",
            "500": "#ff6b6b",
            "600": "#d25858",
            "700": "#a64646",
            "800": "#793333",
            "900": "#4d2020",
            "foreground": "#000",
            "DEFAULT": "#ff6b6b"
          },
          "background": "#1b1526",
          "foreground": "#d0aaff",
          "content1": {
            "DEFAULT": "#392a4a",
            "foreground": "#fff"
          },
          "content2": {
            "DEFAULT": "#4c3560",
            "foreground": "#fff"
          },
          "content3": {
            "DEFAULT": "#5e4180",
            "foreground": "#fff"
          },
          "content4": {
            "DEFAULT": "#704ea0",
            "foreground": "#fff"
          },
          "focus": "#9353d3",
          "overlay": "#ffffff"
        }
      }
    },
    "layout": {
      "disabledOpacity": "0.4",
    }
  })],
}

module.exports = config;