enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

let envLevel: string;

export function log(level: LogLevel, message: string, data?: any) {
  if (!envLevel) {
    envLevel = process.env.LOG_LEVEL;
  }

  if (level === LogLevel.DEBUG && envLevel !== LogLevel.DEBUG) {
    return;
  }

  const timestamp = new Date().toISOString();

  // Use ANSI color codes for pretty output (Bun supports them)
  const color =
    level === LogLevel.ERROR
      ? "\x1b[31m" // Red
      : level === LogLevel.WARN
        ? "\x1b[33m" // Yellow
        : "\x1b[36m"; // Cyan

  const reset = "\x1b[0m"; // Reset color

  const logMessage = `${color}[${timestamp}] [${level}] ${message}${reset}`;

  // Use the appropriate console method
  if (level === LogLevel.ERROR) {
    console.error(logMessage, data || "");
  } else if (level === LogLevel.WARN) {
    console.warn(logMessage, data || "");
  } else {
    console.log(logMessage, data || "");
  }
}

function info(message: string, data?: any) {
  log(LogLevel.INFO, message, data);
}

function warn(message: string, data?: any) {
  log(LogLevel.WARN, message, data);
}

function error(message: string, data?: any) {
  log(LogLevel.ERROR, message, data);
}

function debug(message: string, data?: any) {
  log(LogLevel.DEBUG, message, data);
}

log.error = error;
log.warn = warn;
log.info = info;
log.debug = debug;
