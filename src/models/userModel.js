const CustomError = require("../utils/errors");

const getAllUsers = async (client, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const query = {
        text: `
            SELECT
                u.id,
                u.email,
                u.username,
                u.role,
                u.is_verified,
                u.is_active,
                up.first_name,
                up.last_name,
                up.profile_picture,
                up.bio,
                un.name AS university_name
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
                u.id AS user_id,
                u.email,
                u.username,
                u.role,
                u.is_verified,
                u.is_active,
                u.last_login,
                u.created_at AS user_created_at,
                u.updated_at AS user_updated_at,
                up.id AS profile_id,
                up.first_name,
                up.last_name,
                up.profile_picture,
                up.cover_photo,
                up.bio,
                up.birth_date,
                up.phone,
                up.student_id,
                up.graduation_year,
                up.department,
                up.interests,
                up.address,
                up.profile_visibility_public,
                up.connection_visibility_public,
                up.created_at AS profile_created_at,
                up.updated_at AS profile_updated_at,
                un.id AS university_id,
                un.name AS university_name,
                un.logo_url AS university_logo
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN universities un ON u.university_id = un.id
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

/*
module.exports = {
    getAllUsers,
    getUserProfile,
};
*/


const getUserById = async (client, userId) => {
    const query = {
        text: `
            SELECT
                id,
                email,
                username,
                role,
                is_verified,
                is_active,
                password -- Include password for authentication checks (e.g., updateMyPassword)
            FROM users
            WHERE id = $1
        `,
        values: [userId],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user by ID ${userId}:`, err);
        throw CustomError.internalServerError("Failed to retrieve user details");
    }
};

const updateUserPassword = async (client, userId, newPassword) => {
    const query = {
        text: `
            UPDATE users
            SET password = $1,
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




const updateUserProfile = async (client, userId, {
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
}) => {
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
            SET ${fields.join(', ')}, updated_at = NOW()
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
            SELECT id, university_name, degree, field_of_study, start_date, end_date, description
            FROM user_education
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
        throw CustomError.internalServerError("Failed to retrieve user education");
    }
};

const addEducation = async (client, userId, { university_name, degree, field_of_study, start_date, end_date, description }) => {
    const query = {
        text: `
            INSERT INTO user_education (user_id, university_name, degree, field_of_study, start_date, end_date, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, university_name, degree, field_of_study, start_date, end_date, description
        `,
        values: [userId, university_name, degree, field_of_study, start_date, end_date, description],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error adding education for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to add education");
    }
};

const updateEducation = async (client, userId, educationId, { university_name, degree, field_of_study, start_date, end_date, description }) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (university_name !== undefined) {
        fields.push(`university_name = $${paramIndex++}`);
        values.push(university_name);
    }
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
    if (description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(description);
    }

    if (fields.length === 0) {
        return null; // No fields to update
    }

    values.push(educationId); // Add educationId
    values.push(userId); // Add userId

    const query = {
        text: `
            UPDATE user_education
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
            RETURNING id, university_name, degree, field_of_study, start_date, end_date, description
        `,
        values: values,
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating education ${educationId} for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to update education");
    }
};

const deleteEducation = async (client, userId, educationId) => {
    const query = {
        text: `
            DELETE FROM user_education
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `,
        values: [educationId, userId],
    };

    try {
        const result = await client.query(query);
        return result.rowCount; // Returns 1 if deleted, 0 if not found
    } catch (err) {
        console.error(`Error deleting education ${educationId} for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to delete education");
    }
};

const getUserAchievements = async (client, userId) => {
    const query = {
        text: `
            SELECT id, title, description, date_achieved, issued_by, credential_url
            FROM user_achievements
            WHERE user_id = $1
            ORDER BY date_achieved DESC
        `,
        values: [userId],
    };

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching achievements for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to retrieve user achievements");
    }
};

const addAchievement = async (client, userId, { title, description, date_achieved, issued_by, credential_url }) => {
    const query = {
        text: `
            INSERT INTO user_achievements (user_id, title, description, date_achieved, issued_by, credential_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, title, description, date_achieved, issued_by, credential_url
        `,
        values: [userId, title, description, date_achieved, issued_by, credential_url],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error adding achievement for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to add achievement");
    }
};

const updateAchievement = async (client, userId, achievementId, { title, description, date_achieved, issued_by, credential_url }) => {
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
            UPDATE user_achievements
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
            RETURNING id, title, description, date_achieved, issued_by, credential_url
        `,
        values: values,
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating achievement ${achievementId} for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to update achievement");
    }
};

const deleteAchievement = async (client, userId, achievementId) => {
    const query = {
        text: `
            DELETE FROM user_achievements
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `,
        values: [achievementId, userId],
    };

    try {
        const result = await client.query(query);
        return result.rowCount; // Returns 1 if deleted, 0 if not found
    } catch (err) {
        console.error(`Error deleting achievement ${achievementId} for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to delete achievement");
    }
};

const updateUserBloodGroup = async (client, userId, blood_group) => {
    const query = {
        text: `
            UPDATE user_profiles
            SET blood_group = $1, updated_at = NOW()
            WHERE user_id = $2
            RETURNING id, blood_group
        `,
        values: [blood_group, userId],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating blood group for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to update blood group");
    }
};

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
    updateUserBloodGroup,
};


