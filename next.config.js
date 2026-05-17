/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        "runtime/**/*",
        "./runtime/**/*",
        "**/runtime/**/*",
        "backups/**/*",
        "./backups/**/*",
        "**/backups/**/*",
        "logs/**/*",
        "./logs/**/*",
        "**/logs/**/*",
        "runs/**/*",
        "./runs/**/*",
        "**/runs/**/*",
        "workspaces/**/*",
        "./workspaces/**/*",
        "**/workspaces/**/*",
        "secrets/**/*",
        "./secrets/**/*",
        "**/secrets/**/*",
        "memory/**/*",
        "./memory/**/*",
        "**/memory/**/*",
        ".hermes-workspace/**/*",
        "**/.hermes-workspace/**/*",
        "runtime/hermes/home/hermes-agent/venv/**/*",
        "./runtime/hermes/home/hermes-agent/venv/**/*",
        "**/runtime/hermes/home/hermes-agent/venv/**/*",
        "runtime/hermes/home/hermes-agent/.venv/**/*",
        "./runtime/hermes/home/hermes-agent/.venv/**/*",
        "**/runtime/hermes/home/hermes-agent/.venv/**/*",
        "runtime/hermes/home/hermes-agent/node_modules/**/*",
        "./runtime/hermes/home/hermes-agent/node_modules/**/*",
        "**/runtime/hermes/home/hermes-agent/node_modules/**/*",
        "runtime/cli/node_modules/**/*",
        "./runtime/cli/node_modules/**/*",
        "**/runtime/cli/node_modules/**/*"
      ],
      "/api/**/*": [
        "runtime/**/*",
        "./runtime/**/*",
        "**/runtime/**/*",
        "backups/**/*",
        "./backups/**/*",
        "**/backups/**/*",
        "secrets/**/*",
        "./secrets/**/*",
        "**/secrets/**/*",
        "memory/**/*",
        "./memory/**/*",
        "**/memory/**/*"
      ]
    }
  },
  webpack: (config) => {
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: [
        "**/runtime/**",
        "**/backups/**",
        "**/logs/**",
        "**/runs/**",
        "**/workspaces/**",
        "**/secrets/**",
        "**/memory/**",
        "**/.hermes-workspace/**"
      ]
    };

    return config;
  }
};

module.exports = nextConfig;
