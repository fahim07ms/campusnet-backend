const CustomError = require("../utils/errors");
const pool = require("../config/db");
/**
 * Get all posts with pagination
 */
const getAllPosts = async (client, { page = 1, limit = 10, authorId = null, communityId = null, groupId = null, status = "approved" }) => {
    const offset = (page - 1) * limit;
    const params = [status];
    let paramIndex = 1;
    let conditions = ["status = $1"];
    paramIndex++;

    // Add filters if provided
    if (communityId) {
        conditions.push(`community_id = $${paramIndex++}`);
        params.push(communityId);
    }

    if (groupId) {
        conditions.push(`group_id = $${paramIndex++}`);
        params.push(groupId);
    }

    // For specific user's posts
    if (authorId) {
        conditions.push(`author_id = $${paramIndex++}`);
        params.push(authorId);
    }

    params.push(limit);
    paramIndex++;
    params.push(offset);
    paramIndex++;


    const query = {
        text: `
            SELECT
                p.*,
                u.username as author_username,
                up.first_name as author_first_name,
                up.last_name as author_last_name,
                up.profile_picture as author_profile_picture,
                (
                    SELECT EXISTS(
                        SELECT 1 FROM saved_posts sp
                        WHERE sp.post_id = p.id AND sp.user_id = $${paramIndex}
                    )
                ) as is_saved
            FROM posts p
            JOIN users u ON p.author_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY 
                CASE WHEN p.is_pinned THEN 0 ELSE 1 END,
                CASE WHEN p.is_featured THEN 0 ELSE 1 END,
                p.created_at DESC
            LIMIT $${paramIndex - 2} OFFSET $${paramIndex - 1}
        `,
        values: [...params, authorId || null]
    };


    params.splice(-2);
    const countQuery = {
        text: `
            SELECT COUNT(*) 
            FROM posts 
            WHERE ${conditions.join(' AND ')}
        `,
        values: params // Remove limit and offset
    };

    try {
        const result = await client.query(query);
        const countResult = await client.query(countQuery);

        const totalPosts = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalPosts / limit);

        return {
            posts: result.rows,
            meta: {
                totalItems: totalPosts,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        };
    } catch (err) {
        console.error("Error fetching posts:", err);
        throw CustomError.internalServerError("Failed to retrieve posts");
    }
};

/**
 * Get a post by ID
 */
const getPostById = async (client, postId, userId = null) => {
    const query = {
        text: `
            SELECT 
                p.*,
                u.username as author_username,
                up.first_name as author_first_name,
                up.last_name as author_last_name,
                up.profile_picture as author_profile_picture,
                (
                    SELECT EXISTS(
                        SELECT 1 FROM saved_posts sp 
                        WHERE sp.post_id = p.id AND sp.user_id = $2
                    )
                ) as is_saved
            FROM posts p
            JOIN users u ON p.author_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE p.id = $1
        `,
        values: [postId, userId || null]
    };

    try {
        const result = await client.query(query);
        if (result.rows.length === 0) return null;

        // Increment view count
        await client.query(
            `UPDATE posts SET view_count = view_count + 1 WHERE id = $1`,
            [postId]
        );

        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching post ${postId}:`, err);
        throw CustomError.internalServerError("Failed to retrieve post");
    }
};

/**
 * Create a new post
 */
const createPost = async (client, postData) => {
    const {
        content,
        authorId,
        communityId,
        groupId,
        images = [],
        links = [],
        isPublic = false,
        status = 'pending'
    } = postData;

    try {
        const query = {
            text: `
                INSERT INTO posts (
                    content, 
                    author_id, 
                    community_id, 
                    group_id, 
                    images, 
                    links, 
                    is_public,
                    status
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING *
            `,
            values: [
                content,
                authorId,
                communityId,
                groupId,
                images,
                links,
                isPublic,
                status
            ]
        };

        const result = await client.query(query);
        return result.rows[0] || null;
    } catch (err) {
        console.error("Error creating post:", err);
        throw CustomError.internalServerError("Failed to create post");
    }
};

/**
 * Update a post
 */
const updatePost = async (client, postId, updateData, userId) => {
    // First check if post exists and user has permission
    const checkQuery = {
        text: `
            SELECT * FROM posts WHERE id = $1 AND author_id = $2
        `,
        values: [postId, userId]
    };

    try {
        const checkResult = await client.query(checkQuery);
        if (checkResult.rows.length === 0) {
            throw CustomError.notFound("Post not found or you don't have permission to update it");
        }

        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (updateData.content !== undefined) {
            fields.push(`content = $${paramIndex++}`);
            values.push(updateData.content);
        }
        if (updateData.images !== undefined) {
            fields.push(`images = $${paramIndex++}`);
            values.push(updateData.images);
        }
        if (updateData.links !== undefined) {
            fields.push(`links = $${paramIndex++}`);
            values.push(updateData.links);
        }
        if (updateData.isPublic !== undefined) {
            fields.push(`is_public = $${paramIndex++}`);
            values.push(updateData.isPublic);
        }
        if (updateData.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(updateData.status);
        }

        if (fields.length === 0) {
            return checkResult.rows[0]; // No fields to update
        }

        values.push(postId); // Add postId to values

        const updateQuery = {
            text: `
                UPDATE posts
                SET ${fields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `,
            values: values
        };

        const result = await client.query(updateQuery);
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating post ${postId}:`, err);
        throw CustomError.internalServerError("Failed to update post");
    }
};

/**
 * Approve a post
 */
const approvePost = async (client, postId, moderatorId) => {
    const query = {
        text: `
            UPDATE posts
            SET 
                status = 'approved',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `,
        values: [moderatorId, postId]
    };

    try {
        const result = await client.query(query);
        if (result.rows.length === 0) {
            throw CustomError.notFound("Post not found");
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error approving post ${postId}:`, err);
        throw CustomError.internalServerError("Failed to approve post");
    }
};

/**
 * Unapprove a post
 */
const unapprovePost = async (client, postId, moderatorId) => {
    const query = {
        text: `
            UPDATE posts
            SET 
                status = 'pending',
                approved_by = null,
                approved_at = null
            WHERE id = $1
            RETURNING *
        `,
        values: [postId]
    };

    try {
        const result = await client.query(query);
        if (result.rows.length === 0) {
            throw CustomError.notFound("Post not found");
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error approving post ${postId}:`, err);
        throw CustomError.internalServerError("Failed to unapprove post");
    }
};

/**
 * Delete a post
 */
const deletePost = async (client, postId, userId) => {
    // Check if post exists and user has permission
    const checkQuery = {
        text: `
            SELECT * FROM posts WHERE id = $1 AND author_id = $2
        `,
        values: [postId, userId]
    };

    try {
        const checkResult = await client.query(checkQuery);
        if (checkResult.rows.length === 0) {
            throw CustomError.notFound("Post not found or you don't have permission to delete it");
        }

        const deleteQuery = {
            text: `DELETE FROM posts WHERE id = $1 RETURNING id`,
            values: [postId]
        };

        await client.query(deleteQuery);
        return { id: postId };
    } catch (err) {
        console.error(`Error deleting post ${postId}:`, err);
        throw CustomError.internalServerError("Failed to delete post");
    }
};


/**
 * Toggle pin status for a post
 */
const togglePinPost = async (postId) => {
    const client = await pool.connect();
    try {
        // First get current pin status
        const checkQuery = {
            text: 'SELECT is_pinned FROM posts WHERE id = $1 AND status = \'approved\'',
            values: [postId]
        };
        const checkResult = await client.query(checkQuery);
        if (checkResult.rows.length === 0) {
            return null;
        }

        const currentPinStatus = checkResult.rows[0].is_pinned;

        // Toggle pin status
        const query = {
            text: `
                UPDATE posts 
                SET is_pinned = NOT is_pinned
                WHERE id = $1
                RETURNING *
            `,
            values: [postId]
        };

        const result = await client.query(query);

        return {
            post: result.rows[0],
            action: currentPinStatus ? 'unpinned' : 'pinned'
        };
    } catch (err) {
        console.error("Error toggling pin status:", err);
        throw CustomError.internalServerError("Failed to toggle pin status");
    } finally {
        client.release();
    }
};

/**
 * Toggle feature status for a post
 */
const toggleFeaturePost = async (postId) => {
    const client = await pool.connect();
    try {
        // First get current feature status
        const checkQuery = {
            text: 'SELECT is_featured FROM posts WHERE id = $1 AND status = \'approved\'',
            values: [postId]
        };
        const checkResult = await client.query(checkQuery);
        if (checkResult.rows.length === 0) {
            return null;
        }
        const currentFeatureStatus = checkResult.rows[0].is_featured;

        // Toggle feature status
        const query = {
            text: `
                UPDATE posts 
                SET is_featured = NOT is_featured
                WHERE id = $1
                RETURNING *
            `,
            values: [postId]
        };

        const result = await client.query(query);

        //
        return {
            post: result.rows[0],
            action: currentFeatureStatus ? 'unfeatured' : 'featured'
        };
    } catch (err) {
        console.error("Error toggling feature status:", err);
        throw CustomError.internalServerError("Failed to toggle feature status");
    } finally {
        client.release();
    }
};


/**
 * Save a post for a user
 */
const savePost = async (client, postId, userId) => {
    const checkPostQuery = {
        text: `SELECT * FROM posts WHERE id = $1`,
        values: [postId]
    };

    try {
        const postResult = await client.query(checkPostQuery);
        if (postResult.rows.length === 0) {
            throw CustomError.notFound("Post not found");
        }

        // Check if already saved
        const checkSavedQuery = {
            text: `SELECT * FROM saved_posts WHERE post_id = $1 AND user_id = $2`,
            values: [postId, userId]
        };

        const savedResult = await client.query(checkSavedQuery);
        if (savedResult.rows.length > 0) {
            return savedResult.rows[0];
        }

        const saveQuery = {
            text: `
                INSERT INTO saved_posts (user_id, post_id)
                VALUES ($1, $2)
                RETURNING *
            `,
            values: [userId, postId]
        };

        const result = await client.query(saveQuery);
        return result.rows[0];
    } catch (err) {
        console.error(`Error saving post ${postId} for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to save post");
    }
};

/**
 * Unsave a post for a user
 */
const unsavePost = async (client, postId, userId) => {
    const query = {
        text: `
            DELETE FROM saved_posts 
            WHERE post_id = $1 AND user_id = $2
            RETURNING *
        `,
        values: [postId, userId]
    };

    try {
        const result = await client.query(query);
        return result.rows[0] || null;
    } catch (err) {
        console.error(`Error unsaving post ${postId} for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to unsave post");
    }
};

/**
 * Get all saved posts for a user
 */
const getSavedPosts = async (client, userId, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const query = {
        text: `
            SELECT 
                p.*,
                u.username as author_username,
                up.first_name as author_first_name,
                up.last_name as author_last_name,
                up.profile_picture as author_profile_picture,
                sp.saved_at,
                TRUE as is_saved
            FROM saved_posts sp
            JOIN posts p ON sp.post_id = p.id
            JOIN users u ON p.author_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE sp.user_id = $1
            ORDER BY sp.saved_at DESC
            LIMIT $2 OFFSET $3
        `,
        values: [userId, limit, offset]
    };

    const countQuery = {
        text: `
            SELECT COUNT(*) 
            FROM saved_posts
            WHERE user_id = $1
        `,
        values: [userId]
    };

    try {
        const result = await client.query(query);
        const countResult = await client.query(countQuery);

        const totalPosts = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalPosts / limit);

        return {
            posts: result.rows,
            meta: {
                totalItems: totalPosts,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        };
    } catch (err) {
        console.error(`Error fetching saved posts for user ${userId}:`, err);
        throw CustomError.internalServerError("Failed to retrieve saved posts");
    }
};

module.exports = {
    getAllPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    approvePost,
    unapprovePost,
    togglePinPost,
    toggleFeaturePost,
    savePost,
    unsavePost,
    getSavedPosts
};