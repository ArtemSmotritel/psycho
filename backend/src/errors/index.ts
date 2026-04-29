import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type AppErrorDetails = Record<string, unknown>

export class AppError extends HTTPException {
    code: string
    details?: AppErrorDetails
    constructor(
        status: ContentfulStatusCode,
        code: string,
        message: string,
        details?: AppErrorDetails,
    ) {
        super(status, { message })
        this.code = code
        this.details = details
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', code = 'Unauthorized', details?: AppErrorDetails) {
        super(401, code, message, details)
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found', code = 'NotFound', details?: AppErrorDetails) {
        super(404, code, message, details)
    }
}

export class BadRequestError extends AppError {
    constructor(message: string, code = 'BadRequest', details?: AppErrorDetails) {
        super(400, code, message, details)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', code = 'Forbidden', details?: AppErrorDetails) {
        super(403, code, message, details)
    }
}

export class ConflictError extends AppError {
    constructor(message: string, code = 'Conflict', details?: AppErrorDetails) {
        super(409, code, message, details)
    }
}

export class BadGatewayError extends AppError {
    constructor(message: string, code = 'BadGateway', details?: AppErrorDetails) {
        super(502, code, message, details)
    }
}
