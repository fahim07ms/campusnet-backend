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

const getAllComments = async (client, identityField, identityId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const field = identityField + '_id';

    const query = {
        text: `SELECT * FROM comments WHERE ${field} = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        values: [identityId, limit, offset]
    }

    const result = await client.query(query);
    const countQuery = await client.query(`
        SELECT * FROM comments WHERE ${field} = $1;
    `, [identityId]);

    const totalComments = countQuery.rows[0] ? parseInt( countQuery.rows[0].count, 10) : 0;
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
    const { content, authorId, postId, eventId, parentId } = commentData;

    let query;
    // If it is a reply of a comment in post/event then parentId is given
    if (postId && parentId) {
        // Check if post and comments exists or not
        const post = await PostModel.getPostById(client, postId);
        if (!post) return null;

        const comment = await getCommentById(client, parentId);
        if (!comment) return null;

        query = {
            text: `INSERT INTO comments (post_id, parent_id, content, author_id) VALUES ($1, $2, $3, $4) RETURNING *`,
            values: [postId, parentId, content, authorId]
        }
    } else if (eventId && parentId) {
        // Check if event and comment exists or not
        const comment = await getCommentById(client, parentId);
        if (!comment) return null;

        query = {
            text: `INSERT INTO comments (event_id, parent_id, content, author_id) VALUES ($1, $2, $3, $4) RETURNING *`,
            values: [eventId, parentId, content, authorId]
        }
    } else if (postId) {
        // Check if post exists or not
        const post = await PostModel.getPostById(client, postId);
        if (!post) return null;

        query = {
            text: `INSERT INTO comments (post_id, content, author_id) VALUES ($1, $2, $3) RETURNING *`,
            values: [postId, content, authorId]
        }
    } else if (eventId) {
        // Check if event exists or not
        // TODO

        query = {
            text: `INSERT INTO comments (event_id, content, author_id) VALUES ($1, $2, $3) RETURNING *`,
            values: [eventId, content, authorId]
        }
    }

    const result = await client.query(query);
    return result.rows[0] || null;
}

const updateComment = async (client, commentId, content, author_id) => {
    const comment = await getCommentById(client, commentId);

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