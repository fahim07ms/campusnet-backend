const pool = require("../config/db.js");
const UniversityModel = require("../models/universityModel.js");
const CustomError = require("../utils/errors.js");

const getUniversities = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1 || limit < 1) {
        return next(
            CustomError.badRequest("Page and limit must be positive integers."),
        );
    }

    let client;
    try {
        client = await pool.connect();
        const result = await UniversityModel.getAllUniversities(client, {
            page,
            limit,
        });

        res.status(200).json({
            message: "Universities retrieved successfully.",
            data: {
                universities: result.universities,
            },
            meta: result.meta,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(
                "Unexpected error in getUniversities controller:",
                error,
            );
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while fetching universities.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

/*
module.exports = {
    getUniversities,
};
*/


const createUniversity = async (req, res, next) => {
    const { name, location, description, logo_url, website_url } = req.body;

    if (!name || !location) {
        return next(CustomError.badRequest("University name and location are required."));
    }

    let client;
    try {
        client = await pool.connect();
        const newUniversity = await UniversityModel.createUniversity(client, {
            name,
            location,
            description,
            logo_url,
            website_url,
        });

        res.status(201).json({
            message: "University created successfully.",
            data: newUniversity,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error("Unexpected error in createUniversity controller:", error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while creating the university.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateUniversity = async (req, res, next) => {
    const { universityId } = req.params;
    const { name, location, description, logo_url, website_url } = req.body;

    if (!universityId) {
        return next(CustomError.badRequest("University ID is required."));
    }

    if (!name && !location && !description && !logo_url && !website_url) {
        return next(CustomError.badRequest("At least one field to update is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const updatedUniversity = await UniversityModel.updateUniversity(client, universityId, {
            name,
            location,
            description,
            logo_url,
            website_url,
        });

        if (!updatedUniversity) {
            return next(CustomError.notFound("University not found."));
        }

        res.status(200).json({
            message: "University updated successfully.",
            data: updatedUniversity,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in updateUniversity controller for ID ${universityId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while updating the university.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const deleteUniversity = async (req, res, next) => {
    const { universityId } = req.params;

    if (!universityId) {
        return next(CustomError.badRequest("University ID is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const deletedCount = await UniversityModel.deleteUniversity(client, universityId);

        if (deletedCount === 0) {
            return next(CustomError.notFound("University not found."));
        }

        res.status(200).json({
            message: "University deleted successfully.",
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in deleteUniversity controller for ID ${universityId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while deleting the university.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    getUniversities,
    createUniversity,
    updateUniversity,
    deleteUniversity,
};


