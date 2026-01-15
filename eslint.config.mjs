import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Allow any types with warning for production
      "prefer-const": "error", // Keep this as error
      "@typescript-eslint/no-unused-vars": "warn", // Allow unused vars with warning
      "react-hooks/exhaustive-deps": "warn", // Allow missing deps with warning
      "@next/next/no-img-element": "warn", // Allow img elements with warning
    },
  },
];

export default eslintConfig;
