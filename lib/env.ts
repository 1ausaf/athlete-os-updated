export type NodeEnv = "development" | "production" | "test";

export const nodeEnv = (process.env.NODE_ENV ?? "development") as NodeEnv;

export const isDev = nodeEnv === "development";
export const isProd = nodeEnv === "production";

/** Vercel: `development` (local `vercel dev`), `preview`, or `production`. */
export type VercelEnv = "development" | "preview" | "production";

export const vercelEnv = process.env.VERCEL_ENV as VercelEnv | undefined;

/** True when the app is running on a Vercel production deployment. */
export function isProductionDeployment(): boolean {
  return vercelEnv === "production";
}

/** True on Vercel preview deployments (PR / branch previews). */
export function isPreviewDeployment(): boolean {
  return vercelEnv === "preview";
}
