/** RFC 4122 variant UUID (same pattern as legacy booking checks). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ApiError = { code: string; message: string };

export class ValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

export function isValidUuid(id: string): boolean {
  const t = id?.trim() ?? "";
  return Boolean(t && UUID_RE.test(t));
}

/** Returns trimmed UUID or throws `ValidationError` with code `INVALID_UUID`. */
export function assertValidUuid(id: string): string {
  const t = id?.trim() ?? "";
  if (!t || !UUID_RE.test(t)) {
    throw new ValidationError("INVALID_UUID", "Invalid UUID.");
  }
  return t;
}

/** Alias for `assertValidUuid` (plan naming). */
export const validateUuid = assertValidUuid;

export function toApiError(e: unknown, fallbackCode: string): ApiError {
  if (e instanceof ValidationError) {
    return { code: e.code, message: e.message };
  }
  if (e instanceof Error && e.message) {
    return { code: fallbackCode, message: e.message };
  }
  return {
    code: fallbackCode,
    message: "Something went wrong. Please try again.",
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(value: unknown, fallback: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function parsePagination(input: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number } {
  const page = toPositiveInt(input.page, DEFAULT_PAGE);
  let pageSize = toPositiveInt(input.pageSize, DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;
  return { page, pageSize };
}
