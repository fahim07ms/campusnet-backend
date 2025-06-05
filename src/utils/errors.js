const formatError = (err) => {
    return {
        message: err?.message ? err.message || err.toString() : err.toString(),
        details: err?.details || [],
        timestamp: new Date().toISOString()
    }
}

class CustomError {
    static notFound(err) {
        return {
            name: "resource_not_found",
            code: 404,
            ...formatError(err),
        };
    };

    static badRequest(err) {
        return {
            name: "validation_error",
            code: 400,
            ...formatError(err)
        };
    };

    static unauthorized(err) {
        return {
            name: "unauthorized",
            code: 401,
            ...formatError(err)
        }
    }

    static forbidden(err) {
        return {
            name: "forbidden",
            code: 403,
            ...formatError(err)
        };
    };

    static conflict(err) {
        return {
            name: "resource_conflict",
            code: 409,
            ...formatError(err)
        };
    };

    static tooManyRequests(err) {
        return {
            name: "too_many_request_error",
            code: 429,
            ...formatError(err)
        };
    };

    static internalServerError(err) {
        return {
            name: "internal_server_error",
            code: 500,
            ...formatError(err)
        };
    };

    static throwError(error) {
        const err = new Error(error.message);
        err.code = error.code;
        err.details = error.details;
        err.error = error.name;

        return err;
    }
};

module.exports = CustomError;