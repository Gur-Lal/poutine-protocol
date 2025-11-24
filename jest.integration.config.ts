module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{ts,tsx,js,jsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**config.**",
    "!**/app/**",
    "!**/lib/**",
    "!**/data/**",
    "!src/**/TripData.ts",
    "!src/**/UserData.ts",
    "!src/**/PriceBreakdown.ts",
    "!src/**/stripePaymentService.ts",
    "!src/**/layout.tsx",
    "!**__tests__/**",
    "!**/UI/**",
    "!**/models/**",
    "!**/jest.setup.js",
    "!**/notificationService.ts",
  ],
  testMatch: ["**/__tests__/integration/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setupIntegration.ts"],
  setupFiles: ["<rootDir>/__tests__/setupEnv.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  verbose: true,
  maxWorkers: 1,
  transformIgnorePatterns: [
    "node_modules/(?!(firebase|@firebase)/)"
  ]
};
