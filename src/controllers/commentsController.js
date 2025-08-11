const pool = require('../config/db');
const CommentModel = require('../models/commentsModel');

const CustomError = require('../utils/errors');
const AuthModel = require("../models/authModel");
const {userDataFromId} = require("../models/authModel");

// Security imports
const DOMPurify = require('isomorphic-dompurify');
const sanitizeHtml = require('sanitize-html');
const validator = require('validator');

// Sanitization configurations
const htmlSanitizeConfig = {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a'],
    allowedAttributes: {
        'a': ['href']
    },
    allowedSchemes: ['http', 'https']
};

const sanitizeInput = (input) => {
    if (!input || typeof input !== 'string') return input;
    
    // First sanitize HTML
    let sanitized = sanitizeHtml(input, htmlSanitizeConfig);
    
    // Then use DOMPurify for additional XSS protection
    sanitized = DOMPurify.sanitize(sanitized);
    
    // Normalize and trim
    return validator.trim(sanitized);
};

const validateUUID = (id) => {
    return validator.isUUID(id, 4);
};

const buildCommentTree = (comments) => {
    const map = {};
    const roots = [];

    // Index all comments by ID
    comments.forEach(comment => {
        map[comment.id] = { ...comment, replies: [] };
    });

    // Build the tree
    comments.forEach(comment => {
        if (comment.parent_id) {
            // Append to parent’s replies
            const parent = map[comment.parent_id];
            if (parent) parent.replies.push(map[comment.id]);
        } else {
            // Top-level comment
            roots.push(map[comment.id]);
        }
    });

    return roots;
}


const getComments = async (req, res) => {
    const { postId } = req.params;
    const { eventId } = req.params;
    const { commentId } = req.params;

    let identityField, identityId;
    if (postId) {
        identityId = postId;
        identityField = 'post';
    } else if (commentId) {
        identityId = commentId;
        identityField = 'parent';
    } else if (eventId) {
        identityId = eventId;
        identityField = 'event';
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Check if valid page and limit is given or not
    if (page < 1 || limit < 1) {
        return res.status(400).json(CustomError.badRequest({
            message: "Page and limit must be positive integers.",
        }));
    }

    const client = await pool.connect();
    try {
        const comments = await CommentModel.getAllComments(client, identityField, identityId, page, limit);
        if (!comments) {
            return res.status(404).json(CustomError.notFound({
                message: "No comments found.",
            }))
        }

        return res.status(200).json({
            message: "Successfully retrieved comments.",
            data: {
                comments: [
                    ...buildCommentTree(comments.comments)
                ],
            },
            meta: comments.meta,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json(CustomError.internalServerError({
            message: "Something went wrong",
            details: {
                error: error.message,
            }
        }));
    }
}

const createComment = async (req, res) => {
    const { postId } = req.params;
    const { eventId } = req.params;
    const { parentId } = req.body;
    let { content } = req.body;
    const authorId = req.userId;
    
    // Input validation and sanitization
    if (!content || typeof content !== 'string') {
        return res.status(400).json(CustomError.badRequest({
            message: "Content is required and must be a string."
        }));
    }
    
    // Sanitize content
    content = sanitizeInput(content);
    
    if (content.length > 5000) { // Reasonable limit
        return res.status(400).json(CustomError.badRequest({
            message: "Content too long. Maximum 5000 characters allowed."
        }));
    }
    
    if (!postId && !eventId && !parentId) {
        return res.status(400).json(CustomError.badRequest({
            message: "Invalid request body. postId/eventId/parentId is required!"
        }))
    }
    
    // Validate UUIDs if provided
    if (postId && !validateUUID(postId)) {
        return res.status(400).json(CustomError.badRequest({
            message: "Invalid postId format."
        }));
    }
    
    if (eventId && !validateUUID(eventId)) {
        return res.status(400).json(CustomError.badRequest({
            message: "Invalid eventId format."
        }));
    }
    
    if (parentId && !validateUUID(parentId)) {
        return res.status(400).json(CustomError.badRequest({
            message: "Invalid parentId format."
        }));
    }
    
    const commentData = {
        content,
        authorId,
        postId,
        eventId,
        parentId,
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const author = await AuthModel.userDataFromId(client, authorId);
        if (!author) {
            return res.status(404).json(CustomError.notFound({
                message: "No commenter id found!"
            }));
        }
        
        
        const comment = await CommentModel.createComment(client, commentData);
        if (!comment) {
            return res.status(404).json(CustomError.notFound({
                message: "No such identity found!"
            }));
        }
        
        const commentResult = {
            id: comment.id,
            content: comment.content,
            authorId,
            createdAt: comment.created_at,
            username: author.username,
            profilePicture: author.profilePicture,
            firstName: author.firstName,
            lastName: author.lastName,
        }

        client.query("COMMIT");
        return res.status(201).json({
            message: "Comment posted successfully!",
            data: {
                comment: commentResult,
            }
        })
    } catch (error) {
        client.query("ROLLBACK");
        console.error("Failed to post a comment: ", error);
        return res.status(500).json(CustomError.internalServerError({
            message: "Failed to post comment due to server issue",
            details: {
                error: error.message
            }
        }))
    }

}

const updateComment = async (req, res) => {
    const { commentId } = req.params;
    let { content } = req.body;
    
    // Validate commentId
    if (!validateUUID(commentId)) {
        return res.status(400).json(CustomError.badRequest({
            message: "Invalid commentId format."
        }));
    }
    
    // Validate and sanitize content
    if (!content || typeof content !== 'string') {
        return res.status(400).json(CustomError.badRequest({
            message: "Content is required and must be a string."
        }));
    }
    
    content = sanitizeInput(content);
    
    if (content.length > 5000) {
        return res.status(400).json(CustomError.badRequest({
            message: "Content too long. Maximum 5000 characters allowed."
        }));
    }
    
    
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const comment = await CommentModel.updateComment(client, commentId, content, req.userId);
        if (!comment) {
            return res.status(404).json(CustomError.notFound({
                message: "No such comment found!"
            }));
        }

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Comment updated successfully!",
            data: {
                comment
            }
        })
    } catch (error) {
        await client.query("ROLLBACK");
        console.error('Error in updateComment controller:', error);
        return res.status(500).json(CustomError.internalServerError({
            message: "Failed to update comment. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

const deleteComment = async (req, res) => {
    const { commentId } = req.params;
    const authorId = req.userId;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const comment = await CommentModel.deleteComment(client, commentId, authorId);
        await client.query("COMMIT");
        if (!comment) {
            return res.status(404).json(CustomError.notFound({
                message: "No such comment found!"
            }));
        }

        return res.status(200).json({
            message: "Comment deleted successfully!",
        })
    } catch (error) {
        await client.query("ROLLBACK");
        console.error('Error in deleteComment controller:', error);
        return res.status(500).json(CustomError.internalServerError({
            message: "Failed to delete comment. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

module.exports = {
    getComments,
    createComment,
    updateComment,
    deleteComment
};