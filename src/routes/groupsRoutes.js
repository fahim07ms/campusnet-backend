const express = require('express');
const router = express.Router();

const {
    getAllGroups,
    getAllUserGroups,
    getSuggestedGroups,
    getSpecificGroup,
    updateGroupData,
    deleteGroup,
    joinGroup,
    leaveGroup,
    getAllMemberRequests,
    approveMemberRequest,
    rejectMemberRequest,
    getAllMembers,
    updateMemberRole,
    removeMember,
    getUserGroupRequest
} = require("../controllers/groupsController");
const {authMiddleware} = require("../middlewares/authMiddleware");
const {groupModerator} = require("../middlewares/permissions");
const {getAllEvents, createNewEvent} = require("../controllers/eventsController");

router.get("/", authMiddleware, getAllGroups);
router.get("/my", authMiddleware, getAllUserGroups);
router.get("/suggested", authMiddleware, getSuggestedGroups);
router.get("/:groupId", authMiddleware, getSpecificGroup);
router.put("/:groupId", authMiddleware, groupModerator, updateGroupData);
router.delete("/:groupId", authMiddleware, groupModerator, deleteGroup);

// Group Members
router.get("/:groupId/members", authMiddleware, getAllMembers);
router.put("/:groupId/members/:userId", authMiddleware, groupModerator, updateMemberRole);
router.delete("/:groupId/members/:userId", authMiddleware, removeMember);

router.post("/:groupId/join", authMiddleware, joinGroup);
router.post("/:groupId/leave", authMiddleware, leaveGroup);

// Member Requests
router.get("/:groupId/member-requests", authMiddleware, groupModerator, getAllMemberRequests);
router.get("/:groupId/member-requests/status", authMiddleware, getUserGroupRequest);
router.post("/:groupId/member-requests/:requestId/approve", authMiddleware, groupModerator, approveMemberRequest);
router.post("/:groupId/member-requests/:requestId/reject", authMiddleware, groupModerator, rejectMemberRequest);

// Events
router.get("/:groupId/events", authMiddleware, getAllEvents);
router.post("/:groupId/events", authMiddleware, createNewEvent)

module.exports = {
    groupRoutes: router
}