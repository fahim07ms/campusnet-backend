const pool = require("../config/db");
const customError = require("../utils/errors");
const { validate: isValidUUID } = require('uuid');

const GroupsModel = require("../models/groupsModel");
const CommunityModel = require('../models/communitiesModel');

/**
 *  Controller for getting all groups data
 *  If community Id is provided it will return groups under that community
 */
const getAllGroups = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { communityId } = req.params;

    // Check if page and limit is a positive number or not
    if (page < 1 || limit < 1) {
        return res.status(400).json(customError.badRequest({
            message: "Page and limit must be positive integers.",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        // If looking for groups in community,
        // then check if it is valid uuid or not
        // If valid check if such community exist or not
        if (communityId) {
            if (!isValidUUID(communityId)) {
                return res.status(400).json(customError.badRequest({
                    message: "Invalid communityId!",
                }))
            }

            const community = await CommunityModel.getCommunityById(client, communityId);
            if (!community) {
                return res.status(404).json(customError.notFound({
                    message: "No such community found.",
                }))
            }
        }

        // Query for searching all groups
        const result = await GroupsModel.getALlGroups(client, page, limit, communityId || null);

        return res.status(200).json({
            message: "Successfully retrieved groups.",
            data: {
                groups: result.groups,
            },
            meta: result.meta,
        })
    } catch (error) {
        console.error("Error in getAllGroups controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }
}

/**
 * Controller for getting all groups related to the specific user
 */
const getAllUserGroups = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const userId = req.userId;
    
    // Check if page and limit is valid or not
    if (page < 1 || limit < 1) {
        return res.status(400).json(customError.badRequest({
            message: "Page and limit must be positive integers.",
        }))
    }
    
    let client;
    try {
        client = await pool.connect();
        
        const result = await GroupsModel.getAllGroupsForUser(client, userId, page, limit);
        
        return res.status(200).json({
            message: "Successfully retrieved groups.",
            data: {
                groups: result.groups,
            },
            meta: result.meta,
        });
    } catch (error) {
        console.error("Error in getAllUserGroups controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }
}

/**
 * Controller for getting suggested groups for the authenticated user
 * Returns groups from user's communities that they haven't joined yet
 */
const getSuggestedGroups = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const userId = req.userId;
    
    console.log(page,limit);
    
    // Check if page and limit are valid
    if (page < 1 || limit < 1) {
        console.log("Running!!");
        return res.status(400).json(customError.badRequest({
            message: "Page and limit must be positive integers.",
        }))
    }
    
    let client;
    try {
        client = await pool.connect();
        
        const result = await GroupsModel.getSuggestedGroups(client, userId, page, limit);
        
        return res.status(200).json({
            message: "Successfully retrieved suggested groups.",
            data: {
                groups: result.groups,
            },
            meta: result.meta,
        });
    } catch (error) {
        console.error("Error in getSuggestedGroups controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }
};

/**
 * Controller for creating a new group
 */
const createGroup = async (req, res) => {
    const { name, description, rules, coverImage, logo, isPublic, memberApprovalRequired, postApprovalRequired } = req.body;
    const communityId = req.params.communityId;
    const creatorId = req.userId;

    // Check if name is valid or not
    if (!name) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid request body. Name is required!",
        }))
    }

    // Check if communityId is valid or not
    if (!communityId || !isValidUUID(communityId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid communityId!",
        }))
    }

    const groupData = {
        name,
        description,
        rules,
        coverImage,
        logo,
        isPublic: !!isPublic,
        memberApprovalRequired: !!memberApprovalRequired,
        postApprovalRequired: !!postApprovalRequired,
        communityId,
        creatorId,
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if already a group in the community with same name exists or not
        const group = await GroupsModel.findGroupByName(client, name, communityId);
        if (group) {
            return res.status(409).json(customError.conflict({
                message: "Group with this name already exists.",
            }));
        }

        // Check if community exists or not
        const community = await CommunityModel.getCommunityById(client, communityId);
        if (community === null) {
            return res.status(404).json(customError.notFound({
                message: "No such community found.",
            }))
        }

        // Check if user is a member of the community or not
        const communityMember = await CommunityModel.getMemberDetailsById(client, communityId, creatorId);
        if (!communityMember) {
            return res.status(403).json(customError.forbidden({
                message: "You are not a member of this community.",
            }))
        }

        // Create group
        const result = await GroupsModel.createGroup(client, groupData);

        await client.query("COMMIT");
        return res.status(201).json({
            message: "Group created successfully.",
            data: {
                group: result,
            }
        })
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in createGroup controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }
}

/**
 * Controller for retrieving a specific group with the group's id
 */
const getSpecificGroup = async (req, res) => {
    const { groupId } = req.params;

    if (!isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId"
        }))
    }

    let client;
    try {
        client = await pool.connect();

        // Try to find specific group
        const result = await GroupsModel.findGroupById(client, groupId);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such group found.",
            }))
        }

        return res.status(200).json({
            message: "Successfully retrieved group.",
            data: {
                group: result,
            }
        })
    } catch (error) {
        console.error("Error in getSpecificGroup controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
        }))
    } finally {
        client.release();
    }
}

/**
 * Controller for updating group related data
 */
const updateGroupData = async (req, res) => {
    const { groupId } = req.params;
    const { name, description, rules, coverImage, logo, isPublic, memberApprovalRequired, postApprovalRequired } = req.body;

    // Check if groupId is given or not
    // If given check if it is valid or not
    if (!groupId || !isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }))
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Find group
        const group = await GroupsModel.findGroupById(client, groupId);
        if (!group) {
            return res.status(404).json(customError.notFound({
                message: "No such group found.",
            }))
        }
        // Group update data
        const groupData = {
            groupId,
            name: name || group.name,
            description: description || group.description,
            rules: rules || group.rules,
            coverImage: coverImage || group.coverImage,
            logo: logo || group.logo,
            isPublic: (isPublic === undefined) ? group.isPublic : isPublic,
            memberApprovalRequired: (memberApprovalRequired === undefined) ? group.memberApprovalRequired : memberApprovalRequired,
            postApprovalRequired: (postApprovalRequired === undefined) ? group.postApprovalRequired : postApprovalRequired,
        }

        // Update group
        let result = await GroupsModel.updateGroupData(client, groupId, groupData);

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Group updated successfully.",
            data: {
                group: result,
            }
        })
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in updateGroupData controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
        }))
    } finally {
        client.release();
    }
}

/**
 * Controller for deleting a specific group
 */
const deleteGroup = async (req, res) => {
    const { groupId } = req.params;

    if (!isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }))
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const result = await GroupsModel.deleteGroup(client, groupId);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such group found.",
            }))
        }

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Group deleted successfully.",
        })
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in deleteGroup controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }
}

/**
 * Get all members of a group
 */
const getAllMembers = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const {groupId} = req.params;

    if (!isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        // Check if group exists or not
        const group = await GroupsModel.findGroupById(client, groupId);
        if (!group) {
            return res.status(404).json(customError.notFound({
                message: "No such group found.",
            }))
        }

        // Query for members
        const result = await GroupsModel.getGroupMembers(client, page, limit, groupId);
        
        return res.status(200).json({
            message: "Successfully retrieved members.",
            data: {
                members: result.members,
            },
            meta: result.meta,
        })
    } catch (error) {
        console.error("Error in getAllMembers controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        client.release();
    }
}

/**
 * Update group member's role
 */
const updateMemberRole = async (req, res) => {
    const { groupId, userId } = req.params;
    const { role } = req.body;


    if (!isValidUUID(groupId) || !isValidUUID(userId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId or userId!",
        }))
    }

    // Check if role was given or not
    if (!role) {
        return res.status.json(customError.badRequest('Role is mandatory'));
    }

    if (role !== 'admin' && role !== 'member' && role !== 'moderator') {
        return res.status(400).json(customError.badRequest({
            message: "Invalid role. Role must be either admin, member or pending.",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const result = await GroupsModel.updateGroupMemberRole(client, groupId, userId, role);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such group found with the given userId",
            }))
        }

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Role updated successfully.",
            data: {
                group: result,
            }
        })

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in updateMemberRole controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        client.release();
    }
}

/**
 * Remove a member from the group
 */
const removeMember = async (req, res) => {
    const {groupId, userId} = req.params;
    const {reason} = req.body;

    const moderatorId = req.userId;
    if (!isValidUUID(groupId) || !isValidUUID(userId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId or userId to remove!",
        }))
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if successfully removed or not
        const result = await GroupsModel.removeMemberFromGroup(client, groupId, userId, reason);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such group found with the given userId",
            }))
        }

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Member removed successfully.",
        })
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in removeMember controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        client.release();
    }
}

/**
 * Controller for sending group joining request
 */
const joinGroup = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId;

    // Check if group ID is valid or not
    if (!isValidUUID(groupId) || !groupId) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }))
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if group exists or not
        const group = await GroupsModel.findGroupById(client, groupId);
        if (!group) {
            return res.status(404).json(customError.notFound({
                message: "No such group found.",
            }))
        }

        // Check if user is already a group member or not
        const user = await client.query("SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, userId]);
        if (user.rows.length > 0) {
            return res.status(403).json(customError.forbidden({
                message: "User is already a member of this group.",
            }))
        }

        // Query for joining group
        const result = await GroupsModel.joinGroup(client, groupId, userId);
        if (!result) {
            return res.status(403).json(customError.forbidden({
                message: "User not in the group's community!",
            }))
        }

        await client.query("COMMIT");
        return res.status(201).json({
            message: "Group request sent successfully.",
            data: {
                group: result,
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.log("Error in joinGroup controller:", error);
        if (error.code === '23505') {
            return res.status(409).json(customError.conflict({
                message: "You are already a member of this group or have already sent a request to join this group.",
            }));
        }

        return res.status(500).json(customError.internalServerError({
            message: "Internal server error when joining group. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    }
}

/**
 * Controller for letting the user leave a group
 */
const leaveGroup = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!isValidUUID(groupId) || !groupId) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        // Check if is there any group with this ID or not
        const group = await GroupsModel.findGroupById(client, groupId);
        if (!group) {
            return res.status(404).json(customError.notFound('No such group found'));
        }

        // Try deleting user from group
        const result = await GroupsModel.leaveGroup(client, groupId, userId);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such user found in the group",
            }))
        }

        return res.status(200).json({
            message: "Successfully left group."
        })

    } catch (error) {
        console.log("Error in leaveGroup controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error when leaving group. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    }
}

/**
 * Get all member requests
 */
const getAllMemberRequests = async (req, res) => {
    const { groupId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (!isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        // Check if group exists or not
        const group = await GroupsModel.findGroupById(client, groupId);
        if (!group) {
            return res.status(404).json(customError.notFound({
                message: "No such group found.",
            }))
        }

        // Query for getting all group join requests
        const result = await GroupsModel.getGroupJoinRequests(client, page, limit, groupId);
        return res.status(200).json({
            message: "Successfully retrieved member requests.",
            data: {
                requests: result.requests,
            },
            meta: result.meta,
        });

    } catch (error) {
        console.error("Error in getAllMemberRequests controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }
}

/**
 * Member approval controller
 */
const approveMemberRequest = async (req, res) => {
    const { groupId, requestId } = req.params;
    const moderatorId = req.userId;

    if (!isValidUUID(groupId) || !isValidUUID(requestId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId or userIdToApprove!",
        }))
    }

    let client;
    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const result = await GroupsModel.approveJoinRequest(client, requestId, moderatorId);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "Didn't found any such request."
            }))
        }

        await client.query("COMMIT");
        return res.status(201).json({
            message: "Member request approved successfully.",
        })
    } catch (error) {
        console.error("Error in approveMemberRequest controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }
}

/**
 * Member rejection controller
 */
const rejectMemberRequest = async (req, res) => {
    const { groupId, requestId } = req.params;
    const moderatorId = req.userId;
    const { reason } = req.body;

    if (!isValidUUID(groupId) || !isValidUUID(requestId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId or userIdToReject!",
        }))
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const result = await GroupsModel.rejectJoinRequest(client, requestId, moderatorId, reason);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "Didn't found any such request."
            }))
        }

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Member request rejected successfully.",
        })
    } catch (error) {
        console.error("Error in rejectMemberRequest controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    } finally {
        client.release();
    }

}

const getUserGroupRequest = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId;
    
    if (!isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }))
    }
    
    let client;
    try {
        client = await pool.connect();
        
        const result = await GroupsModel.getUserRequestStatusById(client, groupId, userId);
        if (result === null) {
            return res.status(404).json(customError.notFound({
                message: "No user found with such request"
            }))
        }
        
        return res.status(200).json({
            message: "User status retrieved!",
            data: {
                status: result,
            }
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }))
    }
}

module.exports = {
    getAllGroups,
    getAllUserGroups,
    getSuggestedGroups,
    createGroup,
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
}