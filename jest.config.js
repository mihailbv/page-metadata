export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/jest.setup.ts"],
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  moduleNameMapper: {
    "^\\.\\/src\\/(.*)\\.js$": "<rootDir>/src/$1.ts",
    "^\\.\\.\\/src\\/(.*)\\.js$": "<rootDir>/src/$1.ts",
    "^\\.\\/routes\\/(.*)\\.js$": "<rootDir>/src/routes/$1.ts",
    "^\\.\\/config\\.js$": "<rootDir>/src/config.ts",
    "^\\.\\.\\/config\\.js$": "<rootDir>/src/config.ts",
    "^\\.\\.\\/redis\\.js$": "<rootDir>/src/redis.ts",
    "^\\.\\.\\/metadataUtils\\.js$": "<rootDir>/src/metadataUtils.ts",
  },
  collectCoverage: true,
  coverageProvider: "v8",
  collectCoverageFrom: ["src/**/*.ts"],
  coveragePathIgnorePatterns: ["<rootDir>/src/.*/index\\.ts$"],
  coverageReporters: ["text", "json", "html"],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
};
