const customError = require("../utils/errors");
const pool = require("../config/db");
const PostsModel = require("../models/postsModel");

// Middleware to check if user is a moderator or not
const isPostModerator = async (req, res, next) => {
    const {postId} = req.params;
    const moderatorId = req.userId;

    let client;
    try {
        client = await pool.connect();
        const post = await PostsModel.getPostById(client, postId, moderatorId);

        if (!post) {
            return res.status(404).json(
                customError.notFound({
                    message: "Post not found",
                }),
            );
        }

        const { community_id, group_id } = post;

        let hasPermission = false;
        if (group_id) {
            const res = await client.query(`SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`, [group_id, moderatorId]);
            hasPermission = res.rows[0].role === 'moderator' || res.rows[0].role === 'admin';
        } else if (community_id) {
            const res = await client.query(`SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2`, [community_id, moderatorId]);
            hasPermission = res.rows[0].role === 'moderator' || res.rows[0].role === 'admin';
        }
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

module.exports = {
    isPostModerator,
};
