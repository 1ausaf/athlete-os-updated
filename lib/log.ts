import { isProd, vercelEnv } from "@/lib/env";

function envLabel(): string {
  if (vercelEnv) return vercelEnv;
  return process.env.NODE_ENV ?? "development";
}

export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Tagged console logger for API routes and webhooks. Replace implementation
 * later with a hosted provider without changing call sites.
 */
export function createLogger(namespace: string): Logger {
  const prefix = `[${envLabel()}] [${namespace}]`;

  const sanitize = (args: unknown[]): unknown[] => {
    if (!isProd) return args;
    return args.map((a) => {
      if (typeof a === "string" && a.length > 500) return `${a.slice(0, 500)}…`;
      if (a && typeof a === "object") return "[object]";
      return a;
    });
  };

  return {
    info: (...args: unknown[]) => console.log(prefix, ...sanitize(args)),
    warn: (...args: unknown[]) => console.warn(prefix, ...sanitize(args)),
    error: (...args: unknown[]) => console.error(prefix, ...sanitize(args)),
    debug: (...args: unknown[]) => {
      if (!isProd) console.debug(prefix, ...args);
    },
  };
}
