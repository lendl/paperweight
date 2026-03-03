import { parentPort } from "node:worker_threads";
import { readFileSync } from "fs";

// Worker threads don't have access to 'electron' — electron-log requires it at load time.
// Use a console-based fallback when running in a worker.
function createWorkerLogger() {
  const createScope = (name: string) => {
    const prefix = `[${name}]`;
    return {
      debug: (...args: unknown[]) => console.log(prefix, ...args),
      info: (...args: unknown[]) => console.info(prefix, ...args),
      warn: (...args: unknown[]) => console.warn(prefix, ...args),
      error: (...args: unknown[]) => console.error(prefix, ...args),
      verbose: (...args: unknown[]) => console.log(prefix, ...args),
    };
  };
  return {
    scope: createScope,
    transports: { file: { getFile: () => ({ path: "" }) } },
  };
}

let log: ReturnType<typeof createWorkerLogger> | import("electron-log").MainLogger;

if (typeof parentPort !== "undefined") {
  log = createWorkerLogger();
} else {
  const electronLog = require("electron-log/main").default;
  electronLog.transports.file.level = "info";
  electronLog.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
  electronLog.transports.console.level =
    process.env.NODE_ENV !== "production" ? "debug" : "info";
  log = electronLog;
}

// Scoped loggers
export const appLog = log.scope("app");
export const syncLog = log.scope("sync");
export const authLog = log.scope("auth");
export const licenseLog = log.scope("license");
export const dataLog = log.scope("data");
export const actionLog = log.scope("action");
export const dbLog = log.scope("db");

export function getLogPath(): string {
  return log.transports.file.getFile().path;
}

export function readLogFile(): string {
  try {
    return readFileSync(getLogPath(), "utf-8");
  } catch {
    return "";
  }
}

export default log;
