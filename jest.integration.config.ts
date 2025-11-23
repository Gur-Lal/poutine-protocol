module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/integration/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupIntegration.ts"],
  verbose: true,
  maxWorkers: 1
};
