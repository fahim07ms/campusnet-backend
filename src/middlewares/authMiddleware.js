const jwt = require('jsonwebtoken');
const customError = require("../utils/errors");
const pool = require("../config/db");
const AuthModel = require("../models/authModel");

// Middleware to verify access token
const authMiddleware = async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Check if token is present and valid
    if (!token) {
        return res.status(401).json(customError.unauthorized({
            message: "Access token is missing"
        }));
    }

    // Verify token
    try {
        let payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        const {client} = pool.connect();

        // Check if the user exists in the database
        const user = await AuthModel.findActiveUserById(client, payload.userId);

        if (!user) {
            return res.status(404).json(customError.notFound({
                message: "User not found"
            }));
        }

        // Set user id to request object
        req.userId = payload.userId;

        await client.release();

        next();
    } catch (error) {
        return res.status(403).json(customError.forbidden({
            message: "Invalid or expired access token"
        }));
    }
}

module.exports = {
    authMiddleware
}