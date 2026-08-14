/** @type {import("tailwindcss").Config} */
const designTokens = require("./design-tokens.json");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      borderRadius: designTokens.borderRadius,
      colors: designTokens.colors,
      boxShadow: designTokens.boxShadow,
      elevation: designTokens.elevation,
      fontSize: designTokens.fontSize,
      spacing: designTokens.spacing,
    },
  },
  plugins: [],
};
