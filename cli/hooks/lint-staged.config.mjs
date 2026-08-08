export default {
  "**/*.ltx": "ts-node -P ./cli/tsconfig.json cli/hooks/format_ltx_for_staged.ts",
  "*.{js,ts,tsx,md}": [
    "prettier --write",
    "eslint --config cli/lint/eslint.config.mjs --cache --cache-location target/eslint/cache.json --fix",
    "eslint --config cli/lint/eslint.config.mjs --cache --cache-location target/eslint/cache.json",
  ],
};
