const express = require('express');
const router = express.Router();

const {
    getAllGroups,
    getSpecificGroup,
    updateGroupData,
    // deleteGroup,
    // getGroupMembers,
    // updateMemberRole,
    // removeGroupMember,
    // joinGroup,
    // leaveGroup,
    // getMemberRequests,
    // approveMemberRequest,
    // rejectMemberRequest,
} = require("../controllers/groupsController");
const {authMiddleware} = require("../middlewares/authMiddleware");
const {groupModerator} = require("../middlewares/permissions");

router.get("/", authMiddleware, getAllGroups);
router.get("/:groupId", authMiddleware, getSpecificGroup);
router.put("/:groupId", authMiddleware, groupModerator, updateGroupData);
// router.delete("/:groupId", authMiddleware, groupModerator, deleteGroup);
//
// // Group Members
// router.get("/:groupId/members", authMiddleware, getGroupMembers);
// router.put("/:groupId/members/:memberId", authMiddleware, updateMemberRole);
// router.delete("/:groupId/members/:memberId", authMiddleware, removeGroupMember);
//
// router.post("/:groupId/join", authMiddleware, joinGroup);
// router.post("/:groupId/leave", authMiddleware, leaveGroup);
//
// // Member Requests
// router.get("/:groupId/member-requests", authMiddleware, getMemberRequests);
// router.post("/:groupId/member-requests/:userId/approve", authMiddleware, groupModerator, approveMemberRequest);
// router.post("/:groupId/member-requests/:userId/reject", authMiddleware, groupModerator, rejectMemberRequest);

module.exports = {
    groupRoutes: router
}