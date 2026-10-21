const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Check if next/jest is available
const nextJestAvailable = fs.existsSync(
  path.join(process.cwd(), "node_modules", "next", "jest.js")
);

if (!nextJestAvailable) {
  console.warn(
    "next/jest not found. Using basic jest config. Run 'npm install' first."
  );
  module.exports = {
    testEnvironment: "jest-environment-jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testPathIgnorePatterns: [
      "<rootDir>/node_modules/",
      "<rootDir>/.next/",
      "<rootDir>/db/",
    ],
  };
  return;
}

const createJestConfig = require("next/jest")({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/db/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
