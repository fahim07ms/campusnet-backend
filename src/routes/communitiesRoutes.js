const express = require("express");
const router = express.Router();

const {
    getCommunities,
    createCommunity,
    getCommunityDetails,
    updateCommunityDetails,
    myCommunityDetails,
    getCommunityMembers,
    communityJoinRequest,
    getCommunityMemberDetails,
    updateCommunityMemberDetails,
    removeCommunityMember,
} = require("../controllers/communitiesController");
const {authMiddleware} = require("../middlewares/authMiddleware");
const {
    getAllGroups,
    createGroup
} = require("../controllers/groupsController");
const {
    getAllEvents,
    createNewEvent
} = require("../controllers/eventsController");

router.get("/", getCommunities);

router.post("/", authMiddleware, createCommunity);

router.get("/my", authMiddleware, myCommunityDetails);

router.get("/:id", getCommunityDetails);

router.put("/:id", authMiddleware, updateCommunityDetails);

router.get("/:id/members", authMiddleware, getCommunityMembers);

router.post("/:id/members", authMiddleware, communityJoinRequest);

router.get("/:id/members/:userId", authMiddleware, getCommunityMemberDetails);

router.put("/:id/members/:userId", authMiddleware, updateCommunityMemberDetails);

router.delete("/:id/members/:userId", authMiddleware, removeCommunityMember);

router.get("/:communityId/groups", authMiddleware, getAllGroups);
router.post("/:communityId/groups", authMiddleware, createGroup);

router.get("/:communityId/events", authMiddleware, getAllEvents);
router.post("/:communityId/events", authMiddleware, createNewEvent);


module.exports = {
    communitiesRoutes: router,
};