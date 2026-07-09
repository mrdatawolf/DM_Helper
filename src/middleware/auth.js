const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set. Add a line like the following to your .env file and restart:');
    console.error('  JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'));
    process.exit(1);
}
const JWT_EXPIRES_IN = '24h';

/**
 * Generate JWT token for user
 */
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            isDM: user.is_dm,
            isAdmin: user.username === 'admin'
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
        isDM: decoded.isDM,
        isAdmin: decoded.isAdmin || false
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
                isDM: decoded.isDM,
                isAdmin: decoded.isAdmin || false
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
 * Require admin (username === 'admin')
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    optionalAuth,
    requireDM,
    requireAdmin,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
