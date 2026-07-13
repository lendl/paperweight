/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/analysis/"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "tsconfig.node.json" },
    ],
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
  },
};
