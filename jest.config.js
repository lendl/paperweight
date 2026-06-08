/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
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
