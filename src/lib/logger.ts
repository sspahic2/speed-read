import prisma from "@/lib/prisma";

type LogLevel = "info" | "warn" | "error";

async function persist(
  level: LogLevel,
  message: string,
  metadata: Record<string, unknown> | undefined,
  source: string,
) {
  try {
    await prisma.appLog.create({
      data: {
        level,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        source,
      },
    });
  } catch {
    // Swallow to prevent logging loops
  }
}

function log(
  level: LogLevel,
  message: string,
  metadata: Record<string, unknown> | undefined,
  source: string,
) {
  const tag = `[${source}]`;
  const args = metadata ? [tag, message, metadata] : [tag, message];

  switch (level) {
    case "error":
      console.error(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    default:
      console.info(...args);
  }

  void persist(level, message, metadata, source);
}

export function createLogger(source: string) {
  return {
    info(message: string, metadata?: Record<string, unknown>) {
      log("info", message, metadata, source);
    },
    warn(message: string, metadata?: Record<string, unknown>) {
      log("warn", message, metadata, source);
    },
    error(message: string, metadata?: Record<string, unknown>) {
      log("error", message, metadata, source);
    },
  };
}
