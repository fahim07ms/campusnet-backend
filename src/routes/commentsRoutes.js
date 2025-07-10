const express = require('express');
const router = express.Router();

const {authMiddleware} = require("../middlewares/authMiddleware");
const {updateComment, deleteComment, getComments, createComment} = require("../controllers/commentsController");


router.get("/:commentId/comments", authMiddleware, getComments);
router.post("/:commentId", authMiddleware, createComment);
router.put('/:commentId', authMiddleware, updateComment);
router.delete("/:commentId", authMiddleware, deleteComment);

module.exports = {
    commentsRoutes: router,
}