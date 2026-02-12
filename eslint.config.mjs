import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/.swc/**"],
  },
  ...nextConfig,
];

export default eslintConfig;
