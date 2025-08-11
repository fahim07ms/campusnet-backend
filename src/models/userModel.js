const CustomError = require("../utils/errors");

const getAllUsers = async (client, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const query = {
        text: `
            SELECT
                u.id as "userId",
                u.email,
                u.username,
                u.role,
                u.is_verified as "isVerified",
                u.is_active as "isActive",
                up.first_name as "firstName",
                up.last_name as "lastName",
                up.profile_picture as "profilePicture",
                up.bio,
                un.name as "universityName"
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN universities un ON u.university_id = un.id
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `,
        values: [limit, offset],
    };

    const countQuery = {
        text: "SELECT COUNT(*) FROM users",
    };

    try {
        const result = await client.query(query);
        const countResult = await client.query(countQuery);

        const totalUsers = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalUsers / limit);

        return {
            users: result.rows,
            meta: {
                totalItems: totalUsers,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            },
        };
    } catch (err) {
        console.error("Error fetching users:", err);
        throw CustomError.internalServerError("Failed to retrieve users");
    }
};

const getUserProfile = async (client, userId) => {
    const query = {
        text: `
            SELECT
                u.id AS "userId",
                u.email,
                u.username,
                u.role,
                u.is_verified AS "isVerified",
                u.is_active AS "isActive",
                u.last_login AS "lastLogin",
                u.created_at AS "userCreatedAt",
                u.updated_at AS "userUpdatedAt",
                up.id AS "profileId",
                up.first_name AS "firstName",
                up.last_name AS "lastName",
                up.profile_picture AS "profilePicture",
                up.cover_photo AS "coverPhoto",
                up.bio,
                up.birth_date AS "birthDate",
                up.phone,
                up.student_id AS "studentId",
                up.graduation_year ,
                up.department,
                up.interests,
                up.address,
                up.profile_visibility_public AS "profileVisibilityPublic",
                up.connection_visibility_public AS "connectionVisibilityPublic",
                up.created_at AS "profileCreatedAt",
                up.updated_at AS "profileUpdatedAt",
                un.id AS "universityId",
                un.name AS "universityName",
                un.logo_url AS "universityLogoUrl",
                un.country,
                cm.community_id as "communityId"
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN universities un ON u.university_id = un.id
            LEFT JOIN community_members cm ON u.id = cm.user_id
            WHERE u.id = $1 -- Filter by user ID
        `,
        values: [userId],
    };

    try {
        const result = await client.query(query);

        if (result.rows.length === 0) {
            throw CustomError.notFound("User profile not found.");
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching profile for user ${userId}:`, err);
        if (err.isOperational) {
            throw err;
        }
        throw CustomError.internalServerError(
            "Failed to retrieve user profile",
        );
    }
};

const getUserById = async (client, userId) => {
    const query = {
        text: `
            SELECT
                u.id AS "userId",
                u.email,
                u.username,
                u.role,
                u.is_verified AS "isVerified",
                u.is_active AS "isActive",
                u.last_login AS "lastLogin",
                u.created_at AS "userCreatedAt",
                u.updated_at AS "userUpdatedAt",
                up.id AS "profileId",
                up.first_name AS "firstName",
                up.last_name AS "lastName",
                up.profile_picture AS "profilePicture",
                up.cover_photo AS "coverPhoto",
                up.bio,
                up.birth_date AS "birthDate",
                up.phone,
                up.student_id AS "studentId",
                up.graduation_year ,
                up.department,
                up.interests,
                up.address,
                up.profile_visibility_public AS "profileVisibilityPublic",
                up.connection_visibility_public AS "connectionVisibilityPublic",
                up.created_at AS "profileCreatedAt",
                up.updated_at AS "profileUpdatedAt",
                un.id AS "universityId",
                un.name AS "universityName",
                un.logo_url AS "universityLogoUrl",
                un.country,
                cm.community_id as "communityId"
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN universities un ON u.university_id = un.id
            LEFT JOIN community_members cm ON u.id = cm.user_id
            WHERE id = $1
        `,
        values: [userId],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user by ID ${userId}:`, err);
        throw CustomError.internalServerError(
            "Failed to retrieve user details",
        );
    }
};

const updateUserPassword = async (client, userId, newPassword) => {
    const query = {
        text: `
            UPDATE users
            SET password_hash = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id
        `,
        values: [newPassword, userId],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating password for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to update user password");
    }
};

const updateUserProfile = async (
    client,
    userId,
    {
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
    },
) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
        fields.push(`first_name = $${paramIndex++}`);
        values.push(first_name);
    }
    if (last_name !== undefined) {
        fields.push(`last_name = $${paramIndex++}`);
        values.push(last_name);
    }
    if (bio !== undefined) {
        fields.push(`bio = $${paramIndex++}`);
        values.push(bio);
    }
    if (birth_date !== undefined) {
        fields.push(`birth_date = $${paramIndex++}`);
        values.push(birth_date);
    }
    if (phone !== undefined) {
        fields.push(`phone = $${paramIndex++}`);
        values.push(phone);
    }
    if (student_id !== undefined) {
        fields.push(`student_id = $${paramIndex++}`);
        values.push(student_id);
    }
    if (graduation_year !== undefined) {
        fields.push(`graduation_year = $${paramIndex++}`);
        values.push(graduation_year);
    }
    if (department !== undefined) {
        fields.push(`department = $${paramIndex++}`);
        values.push(department);
    }
    if (interests !== undefined) {
        fields.push(`interests = $${paramIndex++}`);
        values.push(interests);
    }
    if (address !== undefined) {
        fields.push(`address = $${paramIndex++}`);
        values.push(address);
    }
    if (profile_picture !== undefined) {
        fields.push(`profile_picture = $${paramIndex++}`);
        values.push(profile_picture);
    }
    if (cover_photo !== undefined) {
        fields.push(`cover_photo = $${paramIndex++}`);
        values.push(cover_photo);
    }
    if (profile_visibility_public !== undefined) {
        fields.push(`profile_visibility_public = $${paramIndex++}`);
        values.push(profile_visibility_public);
    }
    if (connection_visibility_public !== undefined) {
        fields.push(`connection_visibility_public = $${paramIndex++}`);
        values.push(connection_visibility_public);
    }
    if (university_id !== undefined) {
        fields.push(`university_id = $${paramIndex++}`);
        values.push(university_id);
    }

    if (fields.length === 0) {
        return null; // No fields to update
    }

    values.push(userId); // Add userId to the end of values

    const query = {
        text: `
            UPDATE user_profiles
            SET ${fields.join(", ")}, updated_at = NOW()
            WHERE user_id = $${paramIndex}
            RETURNING *
        `,
        values: values,
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating user profile for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to update user profile");
    }
};

const getUserEducation = async (client, userId) => {
    const query = {
        text: `
            SELECT id, institution, degree, field_of_study, start_date, end_date
            FROM education
            WHERE user_id = $1
            ORDER BY start_date DESC
        `,
        values: [userId],
    };

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching education for user ${userId}:`, err);
        throw CustomError.internalServerError(
            "Failed to retrieve user education",
        );
    }
};

const addEducation = async (
    client,
    userId,
    {
        university_name,
        degree,
        field_of_study,
        start_date,
        end_date,
        description,
    },
) => {
    const query = {
        text: `
            INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, institution, degree, field_of_study, start_date, end_date
        `,
        values: [
            userId,
            university_name,
            degree,
            field_of_study,
            start_date,
            end_date
        ],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error adding education for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to add education");
    }
};

const updateEducation = async (
    client,
    userId,
    educationId,
    {
        degree,
        field_of_study,
        start_date,
        end_date,
    },
) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (degree !== undefined) {
        fields.push(`degree = $${paramIndex++}`);
        values.push(degree);
    }
    if (field_of_study !== undefined) {
        fields.push(`field_of_study = $${paramIndex++}`);
        values.push(field_of_study);
    }
    if (start_date !== undefined) {
        fields.push(`start_date = $${paramIndex++}`);
        values.push(start_date);
    }
    if (end_date !== undefined) {
        fields.push(`end_date = $${paramIndex++}`);
        values.push(end_date);
    }

    if (fields.length === 0) {
        return null; // No fields to update
    }

    values.push(educationId); // Add educationId
    values.push(userId); // Add userId

    const query = {
        text: `
            UPDATE education
            SET ${fields.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
            RETURNING id, degree, field_of_study, start_date, end_date
        `,
        values: values,
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(
            `Error updating education ${educationId} for user ${userId}:`,
            err,
        );
        throw CustomError.internalServerError("Failed to update education");
    }
};

const deleteEducation = async (client, userId, educationId) => {
    const query = {
        text: `
            DELETE FROM education
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `,
        values: [educationId, userId],
    };

    try {
        const result = await client.query(query);
        return result.rowCount; // Returns 1 if deleted, 0 if not found
    } catch (err) {
        console.error(
            `Error deleting education ${educationId} for user ${userId}:`,
            err,
        );
        throw CustomError.internalServerError("Failed to delete education");
    }
};

const getUserAchievements = async (client, userId) => {
    const query = {
        text: `
            SELECT id, title, description, achieved_at, issued_by
            FROM achievements
            WHERE user_id = $1
            ORDER BY achieved_at DESC
        `,
        values: [userId],
    };

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching achievements for user ${userId}:`, err);
        throw CustomError.internalServerError(
            "Failed to retrieve user achievements",
        );
    }
};

const addAchievement = async (
    client,
    userId,
    { title, description, date_achieved, issued_by, credential_url },
) => {
    const query = {
        text: `
            INSERT INTO achievements (user_id, title, description, achieved_at, issued_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, title, description, achieved_at, issued_by
        `,
        values: [
            userId,
            title,
            description,
            date_achieved,
            issued_by,
        ],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error adding achievement for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to add achievement");
    }
};

const updateAchievement = async (
    client,
    userId,
    achievementId,
    { title, description, date_achieved, issued_by, credential_url },
) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(title);
    }
    if (description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(description);
    }
    if (date_achieved !== undefined) {
        fields.push(`date_achieved = $${paramIndex++}`);
        values.push(date_achieved);
    }
    if (issued_by !== undefined) {
        fields.push(`issued_by = $${paramIndex++}`);
        values.push(issued_by);
    }
    if (credential_url !== undefined) {
        fields.push(`credential_url = $${paramIndex++}`);
        values.push(credential_url);
    }

    if (fields.length === 0) {
        return null; // No fields to update
    }

    values.push(achievementId); // Add achievementId
    values.push(userId); // Add userId

    const query = {
        text: `
            UPDATE achievements
            SET ${fields.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
            RETURNING id, title, description, date_achieved, issued_by, credential_url
        `,
        values: values,
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(
            `Error updating achievement ${achievementId} for user ${userId}:`,
            err,
        );
        throw CustomError.internalServerError("Failed to update achievement");
    }
};

const deleteAchievement = async (client, userId, achievementId) => {
    const query = {
        text: `
            DELETE FROM achievements
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `,
        values: [achievementId, userId],
    };

    try {
        const result = await client.query(query);
        return result.rowCount; // Returns 1 if deleted, 0 if not found
    } catch (err) {
        console.error(
            `Error deleting achievement ${achievementId} for user ${userId}:`,
            err,
        );
        throw CustomError.internalServerError("Failed to delete achievement");
    }
};

// const updateUserBloodGroup = async (client, userId, blood_group) => {
//     const query = {
//         text: `
//             UPDATE user_profiles
//             SET blood_group = $1, updated_at = NOW()
//             WHERE user_id = $2
//             RETURNING id, blood_group
//         `,
//         values: [blood_group, userId],
//     };
//
//     try {
//         const result = await client.query(query);
//         return result.rows[0];
//     } catch (err) {
//         console.error(`Error updating blood group for user ${userId}:`, err);
//         throw CustomError.internalServerError("Failed to update blood group");
//     }
// };

module.exports = {
    getAllUsers,
    getUserProfile,
    getUserById,
    updateUserPassword,
    updateUserProfile,
    getUserEducation,
    addEducation,
    updateEducation,
    deleteEducation,
    getUserAchievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    // updateUserBloodGroup,
};
