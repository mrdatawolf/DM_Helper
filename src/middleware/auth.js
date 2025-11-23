const jwt = require('jsonwebtoken');

// Secret key for JWT - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * Generate JWT token for user
 */
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            isDM: user.is_dm
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Authentication middleware - verifies JWT token
 * Adds user info to req.user if authenticated
 */
function authenticate(req, res, next) {
    // Check for token in cookie or Authorization header
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Add user info to request
    req.user = {
        userId: decoded.userId,
        username: decoded.username,
        isDM: decoded.isDM
    };

    next();
}

/**
 * Optional authentication - doesn't fail if no token
 * But adds user info if token is present
 */
function optionalAuth(req, res, next) {
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = {
                userId: decoded.userId,
                username: decoded.username,
                isDM: decoded.isDM
            };
        }
    }

    next();
}

/**
 * Require DM role
 */
function requireDM(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.isDM) {
        return res.status(403).json({ error: 'DM access required' });
    }

    next();
}

/**
 * Check if user owns the character
 */
function requireCharacterOwnership(req, res, next) {
    // This will be used with character routes
    // Implementation depends on character_id parameter
    // For now, just pass through - will implement in route handlers
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    optionalAuth,
    requireDM,
    requireCharacterOwnership,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
