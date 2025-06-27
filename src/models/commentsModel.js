const { pool } = require("../config/db");
const {query} = require("express-validator");
const PostModel = require("./postsModel");

const getCommentById = async (client, commentId) => {
    const query = {
        text: `SELECT * FROM comments WHERE id = $1`,
        values: [commentId]
    }

    const result = await client.query(query);
    return result.rows[0] || null;
}

const getAllComments = async (client, identityId, identityField, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const query = {
        text: `SELECT * FROM comments WHERE ${identityField}_id = $1 ORDER BY updated_at DESC LIMIT $2 AND OFFSET $3;`,
        values: [identityId, limit, offset]
    }

    const result = await client.query(query);
    const countQuery = await client.query(`
        SELECT * FROM comments WHERE ${identityField}_id = $1;
    `, [identityId]);

    if (!result) {
        return null;
    }

    const totalComments = parseInt(countQuery.rows[0].count, 10);
    const totalPages = Math.ceil(totalComments / limit);

    return {
        comments: result.rows,
        meta: {
            totalItems: totalComments,
            itemsPerPage: limit,
            itemCount: result.rows.length,
            currentPage: page,
            totalPages: totalPages,
        }
    };
}

const createComment = async (client, commentData) => {
    const { postId, eventId, parentId, content, authorId } = commentData;

    if (postId) {
        const post = await PostModel.getPostById(client, postId);
        if (!post) return null;

        const query = {
            text: `INSERT INTO comments (post_id, content, author_id) VALUES ($1, $2, $3) RETURNING *`,
            values: [postId, content, authorId]
        }
    } else if (eventId) {
        const query = {
            text: `INSERT INTO comments (event_id, content, author_id) VALUES ($1, $2, $3) RETURNING *`,
            values: [eventId, content, authorId]
        }
    } else if (parentId) {
        const comment = await getCommentById(parentId);
        if (!comment) return null;

        const query = {
            text: `INSERT INTO comments (parent_id, content, author_id) VALUES ($1, $2, $3) RETURNING *`,
            values: [parentId, content, authorId]
        }
    }

    const result = await client.query(query);
    return result.rows[0] || null;
}

const updateComment = async (client, commentId, content, author_id) => {
    const comment = await getCommentById(commentId);

    // If no such comment return null
    if (!comment) return null;

    const query = {
        text: `UPDATE comments
               SET content = $1
               WHERE id = $2 AND author_id = $3
               RETURNING *;
        `,
        values:  [content, commentId, author_id]
    }

    const result = await client.query(query);
    return result.rows[0] || null;
}

const deleteComment = async (client, commentId, authorId) => {
    const query = {
        text: `DELETE FROM comments WHERE id = $1 AND author_id = $2 RETURNING id`,
        values: [commentId, authorId]
    }

    const result = await client.query(query);
    return result.rows[0] || null;
}

module.exports = {
    getAllComments,
    createComment,
    getCommentById,
    updateComment,
    deleteComment
}