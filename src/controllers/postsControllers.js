
const pool = require("../config/db.js");
const PostsModel = require("../models/postsModel.js");
const CustomError = require("../utils/errors.js");
const { getPostReactions } = require("../models/reactionsModel.js");

/**
 * Get all posts with pagination and filtering
 */
const getPosts = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const communityId = req.query.communityId;
    const groupId = req.query.groupId;
    const authorId = req.query.authorId;

    // Check if valid page and limit is given or not
    if (page < 1 || limit < 1) {
        return res.status(400).json(CustomError.badRequest({
            message: "Page and limit must be positive integers.",
        }));
    }

    // // Validate that either communityId or groupId is provided
    // if (!communityId && !groupId) {
    //     return res.status(400).json(CustomError.badRequest({
    //         message: "Either communityId or groupId is required.",
    //     }))
    // }

    let client;
    try {
        client = await pool.connect();
        const result = await PostsModel.getAllPosts(client, {
            page,
            limit,
            authorId,
            communityId,
            groupId,
            status: "approved"
        });

        res.status(200).json({
            message: "Posts retrieved successfully.",
            data: {
                posts: result.posts,
            },
            meta: result.meta,
        });
    } catch (error) {
            console.error("Unexpected error in getPosts controller:", error);
            return res.status(500).json(CustomError.internalServerError({
                message: "An unexpected error occurred while fetching posts.",
                details: {
                    error: error.message
                }
            }))
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Get a specific post by ID
 */
const getPostById = async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.userId || null;

    let client;
    try {
        client = await pool.connect();
        const post = await PostsModel.getPostById(client, postId, userId);
        if (!post) {
            return res.status(404).json(CustomError.notFound({
                message: "Post not found"
            }))
        }

        res.status(200).json({
            message: "Post retrieved successfully.",
            data: {
                post,
            },
        });
    } catch (error) {
            console.error(`Unexpected error in getPostById controller for post ${postId}:`, error);
            return res.status(500).json(CustomError.internalServerError({
                message: "An unexpected error occurred while fetching the post.",
            }));
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Create a new post
 */
const createPost = async (req, res, next) => {
    const { content, communityId, groupId, images, links, isPublic } = req.body;
    const authorId = req.userId;

    // Validate required fields
    if (!content) {
        return res.status(400).json(CustomError.badRequest({
            message: "Content is required.",
        }))
    }

    // Validate that either communityId or groupId is provided
    if (!communityId && !groupId) {
        return res.status(400).json(CustomError.badRequest({
            message: "Either communityId or groupId is required.",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');

        const postData = {
            content,
            authorId,
            communityId,
            groupId,
            images: images || [],
            links: links || [],
            isPublic: isPublic !== undefined ? isPublic : false,
            status: 'pending'
        };

        const post = await PostsModel.createPost(client, postData);

        // Commit transaction
        await client.query('COMMIT');

        res.status(201).json({
            message: "Post created successfully.",
            data: {
                post,
            },
        });
    } catch (error) {
        // Rollback transaction on error
        if (client) {
            await client.query('ROLLBACK');
        }

        console.error("Unexpected error in createPost controller:", error);
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while creating the post.",
        }))
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Update an existing post
 */
const updatePost = async (req, res, next) => {
    const { postId } = req.params;
    const { content, images, links, isPublic } = req.body;
    const userId = req.userId; // Get userId from authMiddleware

    // Validate that there's something to update
    if (!content && images === undefined && links === undefined && isPublic === undefined) {
        return res.status(400).json(CustomError.badRequest({
            message: "No update fields provided.",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');

        const updateData = {
            content,
            images,
            links,
            isPublic,
            status: 'pending' // Reset to pending when a post is updated
        };

        const updatedPost = await PostsModel.updatePost(client, postId, updateData, userId);

        // Commit transaction
        await client.query('COMMIT');

        res.status(200).json({
            message: "Post updated successfully.",
            data: {
                post: updatedPost,
            },
        });
    } catch (error) {
        // Rollback transaction on error
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error(`Unexpected error in updatePost controller for post ${postId}:`, error);
        if (error.status === 404) {
            return res.status(404).json(CustomError.notFound({
               message: "No post found with the given ID."
            }))
        }
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while updating the post.",
        }))
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Delete a post
 */
const deletePost = async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.userId;

    let client;
    try {
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');

        await PostsModel.deletePost(client, postId, userId);

        // Commit transaction
        await client.query('COMMIT');

        res.status(200).json({
            message: "Post deleted successfully.",
        });
    } catch (error) {
        // Rollback transaction on error
        if (client) {
            await client.query('ROLLBACK');
        }

        if (error.status === 404) {
            return res.status(404).json(CustomError.notFound({
                message: "No post found or you don't have permission to delete it."
            }))
        } else {
            console.error(`Unexpected error in deletePost controller for post ${postId}:`, error);
            return res.status(500).json(CustomError.internalServerError({
                message: "An unexpected error occurred while deleting the post.",
            }))
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Approve a post (moderator/admin only)
 */
const approvePost = async (req, res, next) => {
    const { postId } = req.params;
    const moderatorId = req.userId;

    let client;
    try {
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');

        const approvedPost = await PostsModel.approvePost(client, postId, moderatorId);

        // Commit transaction
        await client.query('COMMIT');

        res.status(200).json({
            message: "Post approved successfully.",
            data: {
                post: approvedPost,
            },
        });
    } catch (error) {
        // Rollback transaction on error
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error(`Unexpected error in approvePost controller for post ${postId}:`, error);
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while approving the post.",
        }))
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Unapprove a post
 */
const unapprovePost = async (req, res) => {
    const { postId } = req.params;
    const moderatorId = req.userId;

    let client;
    try {
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');

        const unapprovedPost = await PostsModel.unapprovePost(client, postId, moderatorId);

        // Commit transaction
        await client.query('COMMIT');

        res.status(200).json({
            message: "Post unapproved successfully.",
            data: {
                post: unapprovedPost,
            },
        });
    } catch (error) {
        // Rollback transaction on error
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error(`Unexpected error in unapprovePost controller for post ${postId}:`, error);
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while unapproving the post.",
            details: {
                error: error.message
            }
        }))
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Save a post for the current user
 */
const savePost = async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.userId;

    let client;
    try {
        client = await pool.connect();

        const savedPost = await PostsModel.savePost(client, postId, userId);

        res.status(200).json({
            message: "Post saved successfully.",
            data: {
                savedPost,
            },
        });
    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json(CustomError.notFound({
                message: "No post found with the given ID."
            }))
        } else {
            console.error(`Unexpected error in savePost controller for post ${postId}:`, error);
            return res.status(500).json(CustomError.internalServerError({
                message: "An unexpected error occurred while saving the post.",
            }))
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Unsave a post for the current user
 */
const unsavePost = async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.userId;

    let client;
    try {
        client = await pool.connect();

        const res = await PostsModel.unsavePost(client, postId, userId);
        if (!res) {
            return res.status(404).json(CustomError.notFound({
                message: "No saved post found with the given ID."
            }))
        }

        res.status(200).json({
            message: "Post unsaved successfully.",
        });
    } catch (error) {
        console.error(`Unexpected error in unsavePost controller for post ${postId}:`, error);
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while unsaving the post.",
        }))
    } finally {
        if (client) {
            client.release();
        }
    }
};

/**
 * Get all saved posts for the current user
 */
const getSavedPosts = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const userId = req.userId; // Get userId from authMiddleware

    if (page < 1 || limit < 1) {
        return res.status(400).json(CustomError.badRequest({
            message: "Invalid page number || limit",
        }))
    }

    let client;
    try {
        client = await pool.connect();
        const result = await PostsModel.getSavedPosts(client, userId, {
            page,
            limit,
        });

        res.status(200).json({
            message: "Saved posts retrieved successfully.",
            data: {
                posts: result.posts,
            },
            meta: result.meta,
        });
    } catch (error) {
        console.error("Unexpected error in getSavedPosts controller:", error);
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while retrieving saved posts.",
            details: {
                error: error.message
            }
        }));
    } finally {
        if (client) {
            client.release();
        }
    }
};


/**
 * Toggle pin status of a post (for moderators)
 */
const togglePinPost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        const result = await PostsModel.togglePinPost(postId);
        if (!result) {
            return res.status(404).json(CustomError.notFound({
                message: "No post found with the given ID or post maybe unapproved yet."
            }))
        }

        return res.status(200).json({
            message: `Post ${result.action} successfully`,
            post: result.post
        });
    } catch (err) {
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while pinning the post.",
            details: {
                error: err.message
            }
        }))
    }
};

/**
 * Toggle feature status of a post (for moderators)
 */
const toggleFeaturePost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        const result = await PostsModel.toggleFeaturePost(postId);
        if (!result) {
            return res.status(404).json(CustomError.notFound({
                message: "No post found with the given ID or post maybe unapproved yet."
            }))
        }

        return res.status(200).json({
            message: `Post ${result.action} successfully`,
            post: result.post
        });
    } catch (err) {
        return res.status(500).json(CustomError.internalServerError({
            message: "An unexpected error occurred while featuring the post.",
            details: {
                error: err.message
            }
        }))
    }
};


module.exports = {
    getPosts,
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