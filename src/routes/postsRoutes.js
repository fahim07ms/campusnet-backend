
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


router.get('/', authMiddleware, getPosts);
router.post('/', authMiddleware, createPost);

router.get('/:postId', authMiddleware, getPostById);
router.put('/:postId', authMiddleware, updatePost);
router.delete('/:postId', authMiddleware, deletePost);

// Moderator routes
router.post('/:postId/approve', authMiddleware, isPostModerator, approvePost);
router.post('/:postId/pin', authMiddleware, isPostModerator, togglePinPost);
router.post('/:postId/feature', authMiddleware, isPostModerator, toggleFeaturePost);


module.exports = {
    postsRoutes: router,
}