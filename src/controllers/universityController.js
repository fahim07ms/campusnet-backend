const { pool } = require("../config/db.js");
const UniversityModel = require("../models/universityModel.js");
const CustomError = require("../utils/errors.js");

const getUniversities = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1 || limit < 1) {
        return next(CustomError.badRequest("Page and limit must be positive integers."));
    }

    let client;
    try {
        client = await pool.connect();
        const result = await UniversityModel.getAllUniversities(client, { page, limit });

        res.status(200).json({
            message: "Universities retrieved successfully.",
            data: result.universities,
            pagination: result.pagination,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error("Unexpected error in getUniversities controller:", error);
            next(CustomError.internalServerError("An unexpected error occurred while fetching universities."));
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    getUniversities,
};


