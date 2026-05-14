/**
 * Standardised result type for Server Actions.
 * Frontend can rely on { success } discriminator.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export class ServiceError extends Error {
  code: string;
  constructor(message: string, code = 'SERVICE_ERROR') {
    super(message);
    this.code = code;
  }
}

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}
export function fail(error: string, code = 'SERVICE_ERROR'): ActionResult<never> {
  return { success: false, error, code };
}
