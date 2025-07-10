const express = require('express');
const router = express.Router();

const {authMiddleware} = require("../middlewares/authMiddleware");
const {updateComment, deleteComment, getComments, createComment} = require("../controllers/commentsController");
const {
    getCommentReactions,
    addCommentReaction,
    deleteCommentReaction,
} = require("../controllers/reactionsController");

router.get("/:commentId/comments", authMiddleware, getComments);
router.post("/:commentId", authMiddleware, createComment);
router.put('/:commentId', authMiddleware, updateComment);
router.delete("/:commentId", authMiddleware, deleteComment);

// Reactions
router.get("/:commentId/reactions", authMiddleware, getCommentReactions);
router.post("/:commentId/reactions", authMiddleware, addCommentReaction);
router.delete("/:commentId/reactions/:reactionId", authMiddleware, deleteCommentReaction);

module.exports = {
    commentsRoutes: router,
}