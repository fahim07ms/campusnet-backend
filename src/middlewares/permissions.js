const customError = require("../utils/errors");
const pool = require("../config/db");
const PostsModel = require("../models/postsModel");
const { validate: isValidUUID } = require('uuid');

// Middleware to check if user is a moderator or not
const isPostModerator = async (req, res, next) => {
    const {postId} = req.params;
    const moderatorId = req.userId;

    if (!isValidUUID(postId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid postId"
        }))
    }

    let client;
    try {
        client = await pool.connect();
        const post = await PostsModel.getPostById(client, postId, moderatorId);

        // Check if there is any such post
        if (!post) {
            return res.status(404).json(
                customError.notFound({
                    message: "Post not found",
                }),
            );
        }

        // Get community_id and group_id from post
        const { community_id, group_id } = post;

        // If group_id found, then check if the user is moderator in the group or not
        // Otherwise check in the community_id
        let hasPermission = false;
        if (group_id) {
            const res = await client.query(`SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`, [group_id, moderatorId]);
            hasPermission = res.rows[0].role === 'moderator' || res.rows[0].role === 'admin';
        } else if (community_id) {
            const res = await client.query(`SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2`, [community_id, moderatorId]);
            hasPermission = res.rows[0].role === 'moderator' || res.rows[0].role === 'admin';
        }

        // If the user has no moderator or admin permission then give 403 error
        if (!hasPermission) {
            return res.status(403).json(
                customError.forbidden({
                    message: "You do not have permission to perform this action",
                }),
            );
        }

        client.release();

        next();
    } catch (error) {
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error"
        }))
    }
};

const groupModerator = async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.userId

    let client;
    try {
        client = await pool.connect();

        // If no result found show 404 error
        const result = await client.query(`SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2;`, [groupId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json(customError.notFound({
                message: "No user found with the given id in the group",
            }))
        }

        // Check if user is moderator or admin or nothing
        // If nothing then show error
        if (result.rows[0].role !== 'moderator' && result.rows[0].role !== 'admin') {
            return res.status(403).json(customError.forbidden({
                message: "You do not have permission to perform this action",
            }))
        }

        next();
    } catch (error) {
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error"
        }))
    } finally {
        client.release();
    }
}

module.exports = {
    isPostModerator,
    groupModerator,
};
