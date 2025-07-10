const pool = require("../config/db");
const CustomError = require("../utils/errors");


const addPostReaction = async (reactionData) => {
    let client;
    let { postId, reactionType, userId } = reactionData;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if user has already reacted or not
        // If yes, then update it
        // Else create new one
        const checkPostReaction = await client.query(`SELECT * FROM reactions WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
        let query;
        if (checkPostReaction.rows.length > 0) {
            query = `UPDATE reactions SET reaction_type = $3 WHERE user_id = $1 AND post_id = $2 RETURNING *`;
        } else {
            query = `INSERT INTO reactions (user_id, post_id, reaction_type) VALUES ($1, $2, $3) RETURNING *`;
        }

        const values = [userId, postId, reactionType];
        const result = await client.query(query, values);

        await client.query("COMMIT");

        return result.rows[0] || null;
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Error adding reaction to post: ${postId}:`, error);
        throw CustomError.internalServerError("Failed to add reaction to post");
    } finally {
        await client.release();
    }
}

const addCommentReaction = async (reactionData) => {
    let client;
    let { commentId, reactionType, userId } = reactionData;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if user has already reacted or not
        // If yes, then update it
        // Else create new one
        const checkPostReaction = await client.query(`SELECT * FROM reactions WHERE comment_id = $1 AND user_id = $2`, [commentId, userId]);
        let query;
        if (checkPostReaction.rows.length > 0) {
            query = `UPDATE reactions SET reaction_type = $3 WHERE user_id = $1 AND comment_id = $2 RETURNING *`;
        } else {
            query = `INSERT INTO reactions (user_id, comment_id, reaction_type) VALUES ($1, $2, $3) RETURNING *`;
        }

        const values = [userId, commentId, reactionType];
        const result = await client.query(query, values);

        await client.query("COMMIT");

        return result.rows[0] || null;
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Error adding reaction to comment: ${commentId}:`, error);
        throw CustomError.internalServerError("Failed to add reaction to comment");
    } finally {
        await client.release();
    }
}

const deleteCommentReaction = async ({ commentId, reactionId, userId }) => {
    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const query = `DELETE FROM reactions WHERE id = $1 AND comment_id = $2 AND user_id = $3 RETURNING *`;
        const values = [reactionId, commentId, userId];
        const result = await client.query(query, values);

        await client.query("COMMIT");

        return result.rows[0] || null;
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Error deleting reaction from comment ${commentId}:`, error);
        throw CustomError.internalServerError("Failed to remove reaction from comment");
    } finally {
        await client.release();
    }
}

const deletePostReaction = async ({ postId, reactionId, userId }) => {
    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const query = `DELETE FROM reactions WHERE id = $1 AND post_id = $2 AND user_id = $3 RETURNING *`;
        const values = [reactionId, postId, userId];
        const result = await client.query(query, values);

        await client.query("COMMIT");

        return result.rows[0] || null;
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Error deleting reaction from comment ${postId}:`, error);
        throw CustomError.internalServerError("Failed to remove reaction from comment");
    } finally {
        await client.release();
    }
}

const getPostReactions = async (postId) => {
    let client;
    try {
        client = await pool.connect();

        const query = `SELECT * FROM reactions WHERE post_id = $1`;
        const values = [postId];
        const result = await client.query(query, values);

        return result.rows;
    } catch (error) {
        console.error(`Error getting reactions for post ${postId}:`, error);
        throw CustomError.internalServerError("Failed to get reactions for post");
    } finally {
        await client.release();
    }
}

const getCommentReaction = async (commentId) => {
    let client;
    try {
        client = await pool.connect();

        const query = `SELECT * FROM reactions WHERE comment_id = $1`;
        const values = [commentId];
        const result = await client.query(query, values);

        return result.rows;
    } catch (error) {
        console.error(`Error getting reactions for comment ${commentId}:`, error);
        throw CustomError.internalServerError("Failed to get reactions for comment");
    } finally {
        await client.release();
    }
}


module.exports = {
    addPostReaction,
    addCommentReaction,
    deletePostReaction,
    deleteCommentReaction,
    getPostReactions,
    getCommentReaction,
}
