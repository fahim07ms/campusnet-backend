const pool = require("../config/db");
const ReactionsModel = require("../models/reactionsModel");
const customError = require("../utils/errors");
const { validate: isValidUUID } = require('uuid');

const addPostReaction = async (req, res, next) => {
    const { postId } = req.params;
    const { reactionType } = req.body;
    const userId = req.userId;

    if (!reactionType) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid request body. reactionType is required!"
        }))
    }

    if (!postId || !isValidUUID(postId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid postId"
        }))
    }

    // Make object for passing to model
    const reactionData = {
        postId,
        reactionType,
        userId
    }

    try {
        // Add reaction in the reaction table
        const result = await ReactionsModel.addPostReaction(reactionData);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such post found!"
            }));
        }

        return res.status(201).json({
            message: "Reaction added successfully!",
            data: {
                reaction: result
            }
        });
    } catch (error) {
        console.error("Error in addPostReaction controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Failed to add reaction. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

const addCommentReaction = async (req, res, next) => {
    const { commentId } = req.params;
    const { reactionType } = req.body;
    const userId = req.userId;

    if (!reactionType) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid request body. reactionType is required!"
        }))
    }

    if (!commentId || !isValidUUID(commentId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid commentId"
        }))
    }

    // Make data object for passing to model
    const reactionData = {
        commentId,
        reactionType,
        userId
    }

    try {
        // Add reaction to the table
        const result = await ReactionsModel.addCommentReaction(reactionData);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such post found!"
            }));
        }

        return res.status(201).json({
            message: "Reaction added successfully!",
            data: {
                reaction: result
            }
        });
    } catch (error) {
        console.error("Error in addCommentReaction controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Failed to add reaction. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

const deletePostReaction = async (req, res, next) => {
    const { postId, reactionId } = req.params;
    const userId = req.userId;

    if (!postId || !isValidUUID(postId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid postId"
        }))
    }

    if (!reactionId && !isValidUUID(reactionId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid reactionId"
        }))
    }

    try {
        // Try removing reaction
        // If no reaction found or post found give 404 error
        const result = await ReactionsModel.deletePostReaction({postId, reactionId, userId});
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such post or reaction found!"
            }));
        }

        return res.status(200).json({
            message: "Reaction deleted successfully!",
            data: {
                reaction: result
            }
        });
    } catch (error) {
        console.error("Error in deletePostReaction controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Failed to remove reaction. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

const deleteCommentReaction = async (req, res, next) => {
    const { commentId, reactionId } = req.params;
    const userId = req.userId;

    if (!commentId || !isValidUUID(commentId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid commentId"
        }))
    }

    if (!reactionId && !isValidUUID(reactionId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid reactionId"
        }))
    }

    try {
        // Try removing reaction
        // If no reaction found or post found give 404 error
        const result = await ReactionsModel.deleteCommentReaction({commentId, reactionId, userId});
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such comment or reaction found!"
            }));
        }

        return res.status(200).json({
            message: "Reaction deleted successfully!",
            data: {
                reaction: result
            }
        });
    } catch (error) {
        console.error("Error in deleteCommentReaction controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Failed to remove reaction. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

const getPostReactions = async (req, res, next) => {
    const { postId } = req.params;

    if (!postId || !isValidUUID(postId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid postId"
        }))
    }

    try {
        const result = await ReactionsModel.getPostReactions(postId);

        return res.status(200).json({
            message: "Successfully retrieved reactions!",
            data: {
                reactions: result
            }
        });
    } catch (error) {
        console.error("Error in getPostReactions controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Failed to retrieve reactions. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

const getCommentReactions = async (req, res, next) => {
    const { commentId } = req.params;

    if (!commentId || !isValidUUID(commentId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid commentId"
        }))
    }

    try {
        const result = await ReactionsModel.getCommentReaction(commentId);

        return res.status(200).json({
            message: "Successfully retrieved reactions!",
            data: {
                reactions: result
            }
        });
    } catch (error) {
        console.error("Error in getCommentReactions controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Failed to retrieve reactions. Please try again later.",
            details: {
                error: error.message,
            }
        }));
    }
}

module.exports = {
    addPostReaction,
    addCommentReaction,
    deletePostReaction,
    deleteCommentReaction,
    getPostReactions,
    getCommentReactions
}