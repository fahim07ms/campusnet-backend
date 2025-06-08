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

module.exports = {
    getAllUsers,
    getUserProfile,
};
