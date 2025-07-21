// Find a University by its domain
export const findUniversityByDomain = async (client, domain) => {
    const query =
        "SELECT * FROM universities WHERE EXISTS (" +
        "SELECT 1 " +
        "FROM unnest(domains) AS domain_suffix " +
        "WHERE $1 LIKE '%' || domain_suffix" +
        ");";
    const result = await client.query(query, [domain]);
    return result.rows[0] || null;
};

// Find user by his/her email
export const findUserByEmail = async (client, email) => {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await client.query(query, [email]);
    return result.rows[0] || null;
};

// Find active user by its id
export const findActiveUserById = async (client, userId) => {
    const query = "SELECT * FROM users WHERE id = $1 AND is_active = true;";

    const result = await client.query(query, [userId]);
    return result.rows[0] || null;
};

// Create a user and its initial profile
export const createUser = async (
    client,
    {
        email,
        firstName,
        lastName,
        passwordHash,
        username,
        verificationToken,
        universityId,
    },
) => {
    const query =
        "INSERT INTO users (email, password_hash, username, university_id, verification_token) VALUES ($1, $2, $3, $4, $5) RETURNING id";
    const result = await client.query(query, [
        email,
        passwordHash,
        username,
        universityId,
        verificationToken,
    ]);

    const userId = result.rows[0].id;

    const userProfileQuery =
        "INSERT INTO user_profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)";
    await client.query(userProfileQuery, [userId, firstName, lastName]);
    return userId;
};

// Get user profile by id
export const getUserProfileById = async (client, userId) => {
    const query = "SELECT * FROM user_profiles WHERE user_id = $1";
    const result = await client.query(query, [userId]);
    return result.rows[0] || null;
};

// Update user's last login
export const updateLastLogin = async (client, userId) => {
    const query =
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1";
    await client.query(query, [userId]);
};

// Update user is active or not
export const updateUserIsActive = async (client, userId, is_active) => {
    const query = "UPDATE users SET is_active = $1 WHERE id = $2";
    await client.query(query, [is_active, userId]);
};

// Get base user data from id
export const userDataFromId = async (client, userId) => {
    const query =`
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
            un.country
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN universities un ON u.university_id = un.id
        WHERE u.id = $1
    `;
    const result = await client.query(query, [userId]);
    const user = result.rows[0];
    return user || null;
};

// Insert refresh token
export const insertRefreshToken = async (
    client,
    userId,
    tokenHash,
    ipAddress,
    userAgent,
    expiresAt,
) => {
    const query =
        "INSERT INTO refresh_tokens (user_id, token_hash, ip_address, user_agent, expires_at) " +
        "VALUES ($1, $2, $3, $4, $5)";
    await client.query(query, [
        userId,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt,
    ]);
};

// Find user by its verification token
export const findUserByVerificationToken = async (client, token) => {
    const query =
        "SELECT * FROM users WHERE verification_token = $1 AND is_verified = false";
    const result = await client.query(query, [token]);
    return result.rows[0] || null;
};

// Update user verification token and is_verified status
export const updateUserVerificationToken = async (
    client,
    userId,
    is_verified,
    verificationToken,
) => {
    const query =
        "UPDATE users SET verification_token = $1, is_verified = $2 WHERE id = $3";
    await client.query(query, [verificationToken, is_verified, userId]);
};

// Update user password reset token and expiry time
export const updatePasswordResetToken = async (
    client,
    userId,
    resetToken,
    resetTokenExpiry,
) => {
    const query =
        "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3";
    await client.query(query, [resetToken, resetTokenExpiry, userId]);
};

// Find user by its reset token and expiry time
export const findUserByValidResetToken = async (client, token) => {
    const query =
        "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP";
    const result = await client.query(query, [token]);
    return result.rows[0] || null;
};

// Update user password
export const updatePassword = async (client, userId, passwordHash) => {
    const query =
        "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2";
    await client.query(query, [passwordHash, userId]);
};

// Invalidate all refresh tokens of a user
export const invalidateRefreshToken = async (client, userId, refreshTokenHash) => {
    const query =
        "UPDATE refresh_tokens SET is_active = false WHERE user_id = $1 AND token_hash = $2";
    await client.query(query, [userId, refreshTokenHash]);
};

export const invalidateRefreshTokenByTokenHash = async (client, tokenHash) => {
    const query =
        "UPDATE refresh_tokens SET is_active = false WHERE token_hash = $1";
    await client.query(query, [tokenHash]);
};

// Find refresh token by its token hash and user id
export const findRefreshTokenByTokenHash = async (
    client,
    tokenHash,
    userId,
) => {
    const query =
        "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND is_active = true AND user_id = $2";
    const result = await client.query(query, [tokenHash, userId]);
    return result.rows[0] || null;
};

export const updateRefreshTokenLastUsed = async (client, refreshTokenHash) => {
    const query =  {
        text: `UPDATE refresh_tokens SET last_used_at = now() WHERE token_hash = $1`,
        values: [refreshTokenHash],
    };
    await client.query(query, [refreshTokenHash]);
}

