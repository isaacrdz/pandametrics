import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // All user-facing text goes through next-intl (src/messages); only symbols are allowed in JSX
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        { noStrings: false, allowedStrings: ["·", "/", ".", ":", "%"], ignoreProps: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
