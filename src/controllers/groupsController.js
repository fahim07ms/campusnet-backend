const pool = require("../config/db");
const customError = require("../utils/errors");
const { validate: isValidUUID } = require('uuid');

const GroupsModel = require("../models/groupsModel");
const CommunityModel = require('../models/communitiesModel');

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

module.exports = {
    getAllGroups,
    createGroup,
    getSpecificGroup,
    updateGroupData,
}