/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        "./backups/**/*",
        "./runtime/hermes/home/hermes-agent/.venv/**/*",
        "./runtime/hermes/home/hermes-agent/venv/**/*",
        "./runtime/hermes/home/hermes-agent/node_modules/**/*"
      ],
      "/api/**/*": [
        "./backups/**/*",
        "./runtime/hermes/home/hermes-agent/.venv/**/*",
        "./runtime/hermes/home/hermes-agent/venv/**/*",
        "./runtime/hermes/home/hermes-agent/node_modules/**/*"
      ]
    }
  }
};

module.exports = nextConfig;