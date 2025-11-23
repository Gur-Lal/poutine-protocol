import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  clearMocks: true,

  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{ts,tsx,js,jsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**config.**",
    "!**/api/**",
    "!**/lib/**",
    "!**/data/**",
    "!src/**/TripData.ts",
    "!src/**/UserData.ts",
    "!src/**/PriceBreakdown.ts",
    "!src/**/stripePaymentService.ts",
    "!src/**/layout.tsx",
    "!**__tests__/**",
  ],

  coverageReporters: ["json", "lcov", "text", "html"],

  testEnvironment: "jest-environment-jsdom",

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
  },

  testMatch: [
    "**/__tests__/**/*.test.(ts|tsx|js)",
    "!**/__tests__/integration/**",
    "!**/setupIntegration.(ts|js)",
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};

export default createJestConfig(customJestConfig);

