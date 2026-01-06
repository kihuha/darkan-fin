import "server-only";

type LogPayload = Record<string, unknown>;

function write(level: "info" | "warn" | "error", event: string, payload: LogPayload = {}) {
  const log = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const serialized = JSON.stringify(log);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logInfo(event: string, payload?: LogPayload) {
  write("info", event, payload);
}

export function logWarn(event: string, payload?: LogPayload) {
  write("warn", event, payload);
}

export function logError(event: string, payload?: LogPayload) {
  write("error", event, payload);
}
