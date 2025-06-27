const express = require('express');
const router = express.Router();

const {authMiddleware} = require("../middlewares/authMiddleware");
const {updateComment, deleteComment} = require("../controllers/commentsController");


router.put('/{commentsId}', authMiddleware, updateComment);
router.delete("/{commentId}", authMiddleware, deleteComment);

module.exports = {
    commentsRoutes: router,
}