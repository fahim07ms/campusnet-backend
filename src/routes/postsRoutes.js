
const express = require('express');
const router = express.Router();
const {
    getPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    approvePost,
    togglePinPost,
    toggleFeaturePost,
} = require('../controllers/postsControllers');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isPostModerator } = require('../middlewares/permissions');
const {getComments, createComment} = require("../controllers/commentsController");


router.get('/', authMiddleware, getPosts);
router.post('/', authMiddleware, createPost);

router.get('/:postId', authMiddleware, getPostById);
router.put('/:postId', authMiddleware, updatePost);
router.delete('/:postId', authMiddleware, deletePost);

// Moderator routes
router.post('/:postId/approve', authMiddleware, isPostModerator, approvePost);
router.post('/:postId/pin', authMiddleware, isPostModerator, togglePinPost);
router.post('/:postId/feature', authMiddleware, isPostModerator, toggleFeaturePost);

// Comments
router.get("/:postId/comments", authMiddleware, getComments);
router.post("/:postId/comments", authMiddleware, createComment);


module.exports = {
    postsRoutes: router,
}