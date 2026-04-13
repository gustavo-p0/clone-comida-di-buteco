import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".venv/**", "pw-browsers/**", "output/**", "*.py"]
  },
  ...nextVitals
];

export default config;
