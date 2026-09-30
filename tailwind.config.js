import containerQueries from "@tailwindcss/container-queries"
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"] },
      colors: {
        navy: { 950: "#081938", 900: "#0B2447", 800: "#023A58", 700: "#024F75", 600: "#0A6391" },
        brand: { blue: "#007DC5", orange: "#F39325", "orange-deep": "#DD7A16" },
        ink: { DEFAULT: "#0F1B2D", 2: "#4A5565", 3: "#7A8494" },
        line: "#E3E7EC",
        plane: "#F4F6F9",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,45,0.06), 0 4px 16px -8px rgba(15,27,45,0.12)",
      },
    },
  },
  plugins: [containerQueries],
}
