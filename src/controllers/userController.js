const pool = require("../config/db.js");
const UserModel = require("../models/userModel.js");
const CustomError = require("../utils/errors.js");

const getUsers = async (req, res, next) => {
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
        const result = await UserModel.getAllUsers(client, { page, limit });

        res.status(200).json({
            message: "Users retrieved successfully.",
            data: result.users,
            meta: result.meta,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error("Unexpected error in getUsers controller:", error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while fetching users.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getMyProfile = async (req, res, next) => {
    const userId = req.userId;

    if (!userId) {
        return next(
            CustomError.unauthorized(
                "Authentication required. User ID not found in request.",
            ),
        );
    }

    let client;
    try {
        client = await pool.connect();
        const profile = await UserModel.getUserProfile(client, userId);

        res.status(200).json({
            message: "Profile retrieved successfully.",
            data: {
                profile,
            },
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(
                `Unexpected error in getMyProfile controller for user ${userId}:`,
                error,
            );
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while fetching the profile.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getMe = async (req, res, next) => {
    const userId = req.userId;

    if (!userId) {
        return next(
            CustomError.unauthorized(
                "Authentication required. User ID not found in request.",
            ),
        );
    }

    let client;
    try {
        client = await pool.connect();
        const user = await UserModel.getUserById(client, userId);

        if (!user) {
            return next(CustomError.notFound("User not found."));
        }

        res.status(200).json({
            message: "User details retrieved successfully.",
            data: user,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(
                `Unexpected error in getMe controller for user ${userId}:`,
                error,
            );
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while fetching user details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateMyPassword = async (req, res, next) => {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
        return next(
            CustomError.unauthorized(
                "Authentication required. User ID not found in request.",
            ),
        );
    }

    if (!currentPassword || !newPassword) {
        return next(
            CustomError.badRequest(
                "Current password and new password are required.",
            ),
        );
    }

    let client;
    try {
        client = await pool.connect();
        const user = await UserModel.getUserById(client, userId);

        if (!user) {
            return next(CustomError.notFound("User not found."));
        }

        // In a real application, you would hash the currentPassword and compare it with the stored hash
        // For now, we'll do a simple comparison (replace with bcrypt.compare in production)
        if (currentPassword !== user.password) { // Assuming user.password is plain text for now, will be hashed in real app
            return next(CustomError.unauthorized("Incorrect current password."));
        }

        // In a real application, you would hash the newPassword before storing it
        const hashedPassword = newPassword; // Replace with bcrypt.hash in production

        await UserModel.updateUserPassword(client, userId, hashedPassword);

        res.status(200).json({
            message: "Password updated successfully.",
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(
                `Unexpected error in updateMyPassword controller for user ${userId}:`,
                error,
            );
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while updating password.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getUserById = async (req, res, next) => {
    const { userId } = req.params;

    if (!userId) {
        return next(CustomError.badRequest("User ID is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const user = await UserModel.getUserById(client, userId);

        if (!user) {
            return next(CustomError.notFound("User not found."));
        }

        res.status(200).json({
            message: "User details retrieved successfully.",
            data: user,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(
                `Unexpected error in getUserById controller for user ${userId}:`,
                error,
            );
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while fetching user details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateMyProfile = async (req, res, next) => {
    const userId = req.userId;
    const { first_name, last_name, bio, birth_date, phone, student_id, graduation_year, department, interests, address, profile_picture, cover_photo, profile_visibility_public, connection_visibility_public, university_id } = req.body;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    let client;
    try {
        client = await pool.connect();
        const updatedProfile = await UserModel.updateUserProfile(client, userId, {
            first_name,
            last_name,
            bio,
            birth_date,
            phone,
            student_id,
            graduation_year,
            department,
            interests,
            address,
            profile_picture,
            cover_photo,
            profile_visibility_public,
            connection_visibility_public,
            university_id,
        });

        if (!updatedProfile) {
            return next(CustomError.notFound("User profile not found or no changes made."));
        }

        res.status(200).json({
            message: "Profile updated successfully.",
            data: updatedProfile,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in updateMyProfile controller for user ${userId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while updating the profile.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getMyEducation = async (req, res, next) => {
    const userId = req.userId;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    let client;
    try {
        client = await pool.connect();
        const education = await UserModel.getUserEducation(client, userId);

        res.status(200).json({
            message: "Education details retrieved successfully.",
            data: education,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in getMyEducation controller for user ${userId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while fetching education details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const addMyEducation = async (req, res, next) => {
    const userId = req.userId;
    const { university_name, degree, field_of_study, start_date, end_date, description } = req.body;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    if (!university_name || !degree || !field_of_study || !start_date) {
        return next(CustomError.badRequest("University name, degree, field of study, and start date are required."));
    }

    let client;
    try {
        client = await pool.connect();
        const newEducation = await UserModel.addEducation(client, userId, {
            university_name,
            degree,
            field_of_study,
            start_date,
            end_date,
            description,
        });

        res.status(201).json({
            message: "Education added successfully.",
            data: newEducation,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in addMyEducation controller for user ${userId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while adding education details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateMyEducation = async (req, res, next) => {
    const userId = req.userId;
    const { educationId } = req.params;
    const { university_name, degree, field_of_study, start_date, end_date, description } = req.body;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    if (!educationId) {
        return next(CustomError.badRequest("Education ID is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const updatedEducation = await UserModel.updateEducation(client, userId, educationId, {
            university_name,
            degree,
            field_of_study,
            start_date,
            end_date,
            description,
        });

        if (!updatedEducation) {
            return next(CustomError.notFound("Education entry not found or no changes made."));
        }

        res.status(200).json({
            message: "Education updated successfully.",
            data: updatedEducation,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in updateMyEducation controller for user ${userId} and education ${educationId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while updating education details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const deleteMyEducation = async (req, res, next) => {
    const userId = req.userId;
    const { educationId } = req.params;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    if (!educationId) {
        return next(CustomError.badRequest("Education ID is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const deletedCount = await UserModel.deleteEducation(client, userId, educationId);

        if (deletedCount === 0) {
            return next(CustomError.notFound("Education entry not found."));
        }

        res.status(200).json({
            message: "Education deleted successfully.",
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in deleteMyEducation controller for user ${userId} and education ${educationId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while deleting education details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getMyAchievements = async (req, res, next) => {
    const userId = req.userId;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    let client;
    try {
        client = await pool.connect();
        const achievements = await UserModel.getUserAchievements(client, userId);

        res.status(200).json({
            message: "Achievements retrieved successfully.",
            data: achievements,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in getMyAchievements controller for user ${userId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while fetching achievements.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const addMyAchievement = async (req, res, next) => {
    const userId = req.userId;
    const { title, description, date_achieved, issued_by, credential_url } = req.body;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    if (!title || !date_achieved) {
        return next(CustomError.badRequest("Achievement title and date achieved are required."));
    }

    let client;
    try {
        client = await pool.connect();
        const newAchievement = await UserModel.addAchievement(client, userId, {
            title,
            description,
            date_achieved,
            issued_by,
            credential_url,
        });

        res.status(201).json({
            message: "Achievement added successfully.",
            data: newAchievement,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in addMyAchievement controller for user ${userId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while adding achievement details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateMyAchievement = async (req, res, next) => {
    const userId = req.userId;
    const { achievementId } = req.params;
    const { title, description, date_achieved, issued_by, credential_url } = req.body;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    if (!achievementId) {
        return next(CustomError.badRequest("Achievement ID is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const updatedAchievement = await UserModel.updateAchievement(client, userId, achievementId, {
            title,
            description,
            date_achieved,
            issued_by,
            credential_url,
        });

        if (!updatedAchievement) {
            return next(CustomError.notFound("Achievement entry not found or no changes made."));
        }

        res.status(200).json({
            message: "Achievement updated successfully.",
            data: updatedAchievement,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in updateMyAchievement controller for user ${userId} and achievement ${achievementId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while updating achievement details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const deleteMyAchievement = async (req, res, next) => {
    const userId = req.userId;
    const { achievementId } = req.params;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    if (!achievementId) {
        return next(CustomError.badRequest("Achievement ID is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const deletedCount = await UserModel.deleteAchievement(client, userId, achievementId);

        if (deletedCount === 0) {
            return next(CustomError.notFound("Achievement entry not found."));
        }

        res.status(200).json({
            message: "Achievement deleted successfully.",
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in deleteMyAchievement controller for user ${userId} and achievement ${achievementId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while deleting achievement details.",
                ),
            );
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateMyBloodGroup = async (req, res, next) => {
    const userId = req.userId;
    const { blood_group } = req.body;

    if (!userId) {
        return next(CustomError.unauthorized("Authentication required. User ID not found in request."));
    }

    if (!blood_group) {
        return next(CustomError.badRequest("Blood group is required."));
    }

    let client;
    try {
        client = await pool.connect();
        const updatedProfile = await UserModel.updateUserBloodGroup(client, userId, blood_group);

        if (!updatedProfile) {
            return next(CustomError.notFound("User profile not found or no changes made."));
        }

        res.status(200).json({
            message: "Blood group updated successfully.",
            data: updatedProfile,
        });
    } catch (error) {
        if (error.name && error.code) {
            next(error);
        } else {
            console.error(`Unexpected error in updateMyBloodGroup controller for user ${userId}:`, error);
            next(
                CustomError.internalServerError(
                    "An unexpected error occurred while updating blood group.",
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
    getUsers,
    getMyProfile,
    getMe,
    updateMyPassword,
    getUserById,
    updateMyProfile,
    getMyEducation,
    addMyEducation,
    updateMyEducation,
    deleteMyEducation,
    getMyAchievements,
    addMyAchievement,
    updateMyAchievement,
    deleteMyAchievement,
    updateMyBloodGroup,
};


