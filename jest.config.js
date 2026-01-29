export default {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/jest.setup.js"],
  collectCoverage: true,
  coverageProvider: "v8",
  collectCoverageFrom: ["src/**/*.js"],
  coveragePathIgnorePatterns: ["<rootDir>/src/.*/index\\.js$"],
  coverageReporters: ["text", "json", "html"],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
};
