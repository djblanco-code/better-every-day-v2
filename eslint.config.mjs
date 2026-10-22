import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Flat config (eslint-config-next 16 ships flat presets directly; no FlatCompat).
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  { ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"] },
];

export default eslintConfig;
