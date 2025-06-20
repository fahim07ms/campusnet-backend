const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Hash an existing token
const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

// Generate a random token
const generateRandomToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

// Generate access token
const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, jti: crypto.randomUUID() },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
    );
};

module.exports = {
    generateRandomToken,
    hashToken,
    generateAccessToken,
    generateRefreshToken,
};
