import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class AppError extends HTTPException {
    code: string
    constructor(status: ContentfulStatusCode, code: string, message: string) {
        super(status, { message })
        this.code = code
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found', code = 'NotFound') {
        super(404, code, message)
    }
}

export class BadRequestError extends AppError {
    constructor(message: string, code = 'BadRequest') {
        super(400, code, message)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', code = 'Forbidden') {
        super(403, code, message)
    }
}
