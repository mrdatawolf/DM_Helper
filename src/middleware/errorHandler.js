// Wraps a route handler so a thrown or rejected error is forwarded to next(),
// instead of every route hand-writing its own try/catch.
function asyncHandler(fn) {
    return function (req, res, next) {
        try {
            const result = fn(req, res, next);
            if (result && typeof result.catch === 'function') {
                result.catch(next);
            }
        } catch (err) {
            next(err);
        }
    };
}

// Centralized error response. A handler can attach `status` to pick a status
// code other than 500, and `clientMessage` to send a client-facing message
// that differs from `error.message` (e.g. hiding an internal DB error behind
// a generic "Login failed"). Note: this is deliberately not named `expose` —
// Express's own error-handling convention (used by body-parser, http-errors,
// etc.) already uses `err.expose` as a boolean meaning "safe to show
// err.message", which is a different contract than a replacement string.
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.clientMessage || err.message || 'Internal server error';
    res.status(status).json({ error: message });
}

module.exports = { asyncHandler, errorHandler };
