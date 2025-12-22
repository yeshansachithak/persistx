// packages/core/src/definition-errors.ts
export type PersistxErrorCode =
  | "DEFINITION_NOT_FOUND"
  | "DEFINITION_INVALID"
  | "VALIDATION_FAILED"
  | "UNKNOWN_FIELD"
  | "DOC_ID_RESOLUTION_FAILED"
  | "HOOK_FAILED";

export class PersistxError extends Error {
  public readonly code: PersistxErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: PersistxErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "PersistxError";
    this.code = code;
    this.details = details;
  }
}

export class DefinitionNotFoundError extends PersistxError {
  constructor(formKey: string, version: number) {
    super(
      "DEFINITION_NOT_FOUND",
      `Form definition not found: ${formKey}@${version}`,
      { formKey, version }
    );
    this.name = "DefinitionNotFoundError";
  }
}

export class DefinitionInvalidError extends PersistxError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("DEFINITION_INVALID", message, details);
    this.name = "DefinitionInvalidError";
  }
}

export class ValidationFailedError extends PersistxError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_FAILED", message, details);
    this.name = "ValidationFailedError";
  }
}

export class UnknownFieldError extends PersistxError {
  constructor(field: string, formKey: string, version: number) {
    super(
      "UNKNOWN_FIELD",
      `Unknown field "${field}" for ${formKey}@${version}`,
      { field, formKey, version }
    );
    this.name = "UnknownFieldError";
  }
}

export class DocIdResolutionError extends PersistxError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("DOC_ID_RESOLUTION_FAILED", message, details);
    this.name = "DocIdResolutionError";
  }
}

export class HookFailedError extends PersistxError {
  constructor(hookName: string, message: string, details?: Record<string, unknown>) {
    super("HOOK_FAILED", `Hook "${hookName}" failed: ${message}`, { hookName, ...details });
    this.name = "HookFailedError";
  }
}
