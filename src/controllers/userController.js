const { pool } = require("../config/db.js");
const UserModel = require("../models/userModel.js");
const CustomError = require("../utils/errors.js");

const getUsers = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1 || limit < 1) {
        return next(CustomError.badRequest("Page and limit must be positive integers."));
    }

    let client;
    try {
        client = await pool.connect();
        const result = await UserModel.getAllUsers(client, { page, limit });

        res.status(200).json({
            message: "Users retrieved successfully.",
            data: result.users,
            pagination: result.pagination,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error("Unexpected error in getUsers controller:", error);
            next(CustomError.internalServerError("An unexpected error occurred while fetching users."));
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getMyProfile = async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    let client;
    try {
        client = await pool.connect();
        const profile = await UserModel.getUserProfile(client, userId);

        res.status(200).json({
            message: "Profile retrieved successfully.",
            data: profile,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in getMyProfile controller for user ${userId}:`, error);
            next(CustomError.internalServerError("An unexpected error occurred while fetching the profile."));
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    getUsers,
    getMyProfile,
};


