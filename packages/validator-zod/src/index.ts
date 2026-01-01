// packages/validator-zod/src/index.ts
import type { ZodSchema } from "zod";

export type ZodValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: unknown };

export function validateWithZod<T>(schema: ZodSchema<T>, payload: unknown): ZodValidationResult<T> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues };
  return { ok: true, data: parsed.data };
}
