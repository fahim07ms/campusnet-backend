
const express = require('express');
const router = express.Router();
const {
    getPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    approvePost,
    unapprovePost,
    togglePinPost,
    toggleFeaturePost,
} = require('../controllers/postsControllers');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isPostModerator } = require('../middlewares/permissions');
const {getComments, createComment} = require("../controllers/commentsController");
const {
    getPostReactions,
    addPostReaction,
    deletePostReaction
} = require("../controllers/reactionsController");


router.get('/', authMiddleware, getPosts);
router.post('/', authMiddleware, createPost);

router.get('/:postId', authMiddleware, getPostById);
router.put('/:postId', authMiddleware, updatePost);
router.delete('/:postId', authMiddleware, deletePost);

// Moderator routes
router.post('/:postId/approve', authMiddleware, isPostModerator, approvePost);
router.post('/:postId/pin', authMiddleware, isPostModerator, togglePinPost);
router.post('/:postId/feature', authMiddleware, isPostModerator, toggleFeaturePost);
router.post('/:postId/unapprove', authMiddleware, isPostModerator, unapprovePost);

// Comments
router.get("/:postId/comments", authMiddleware, getComments);
router.post("/:postId/comments", authMiddleware, createComment);

// Reactions
router.get("/:postId/reactions", authMiddleware, getPostReactions);
router.post("/:postId/reactions", authMiddleware, addPostReaction);
router.delete("/:postId/reactions/:reactionId", authMiddleware, deletePostReaction);



module.exports = {
    postsRoutes: router,
}