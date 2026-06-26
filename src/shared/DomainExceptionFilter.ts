/**
 * DomainExceptionFilter — maps typed DomainError subclasses to HTTP responses
 * (design Decision #10, W7).
 *
 * Registered globally in main.ts via `useGlobalFilters`. Each DomainError
 * subclass is mapped to a stable status code; unknown DomainErrors fall back
 * to 500 so no domain failure ever surfaces as a raw 500 with a stack trace.
 *
 * Lives in shared/ for cross-context reuse; it is a NestJS infrastructure-tier
 * adapter and is exempted from the framework-agnostic layer guard in
 * .eslintrc.cjs.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  DuplicateEmailError,
  InvalidCredentialsError,
  NonExistentUserError,
  PasswordStrengthError,
  UnauthenticatedError,
  ValidationError,
} from './errors';

/**
 * Stable mapping from DomainError subclass to HTTP status.
 * Kept as a class-level table so the mapping is auditable in one place.
 */
const STATUS_BY_ERROR: ReadonlyArray<{ type: new (code: string) => DomainError; status: HttpStatus }> = [
  { type: DuplicateEmailError, status: HttpStatus.CONFLICT }, // 409
  { type: PasswordStrengthError, status: HttpStatus.UNPROCESSABLE_ENTITY }, // 422
  { type: ValidationError, status: HttpStatus.UNPROCESSABLE_ENTITY }, // 422
  { type: InvalidCredentialsError, status: HttpStatus.UNAUTHORIZED }, // 401
  { type: UnauthenticatedError, status: HttpStatus.UNAUTHORIZED }, // 401
  { type: NonExistentUserError, status: HttpStatus.UNAUTHORIZED }, // 401
];

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const status = this.resolveStatus(error);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response.status(status).json({
      statusCode: status,
      code: error.code,
      error: error.name,
      message: error.message,
    });
  }

  /** First matching subclass wins; unknown DomainError -> 500. */
  private resolveStatus(error: DomainError): HttpStatus {
    for (const entry of STATUS_BY_ERROR) {
      if (error instanceof entry.type) return entry.status;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
