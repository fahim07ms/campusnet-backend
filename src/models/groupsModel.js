const pool = require('../config/db');
const CustomError = require("../utils/errors");

const getALlGroups = async (client, page, limit, communityId) => {
    const offset = (page - 1) * limit;

    // Make initial query and parameters
    let query = `SELECT
                            g.id,
                            g.community_id as "communityId",
                            g.name,
                            g.description,
                            g.rules,
                            g.cover_image as "coverImage",
                            g.logo,
                            g.is_public as "isPublic",
                            g.member_approval as "memberApprovalRequired",
                            g.post_approval as "postApprovalRequired",
                            g.created_at as "createdAt",
                            g.member_count as "memberCount"
                        FROM groups g ORDER BY name LIMIT $1 OFFSET $2`;
    let countQuery = `SELECT COUNT(*) FROM groups`;
    let params = [limit, offset];

    // If there is a community id given then change query and params
    if (communityId) {
        query = `SELECT * FROM groups WHERE community_id = $3 ORDER BY name LIMIT $1 OFFSET $2`;
        countQuery = `SELECT COUNT(*) FROM groups WHERE community_id = $1`;
        params.push(communityId);
    }

    // Query and show result
    let groupsResult;
    try {
        groupsResult = await client.query(query, params);
        const countResult = (communityId) ? await client.query(countQuery, [communityId]) : await client.query(countQuery);

        const totalGroups = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalGroups / limit);

        return {
            groups: groupsResult.rows,
            meta: {
                totalItems: totalGroups,
                itemsPerPage: limit,
                itemCount: groupsResult.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        } || null;
    } catch (err) {
        console.error('Error fetching groups:', err)
        throw CustomError.internalServerError('Failed to retrieve groups');
    }
}

const getAllGroupsForUser = async (client, userId, page, limit) => {
    const offset = (page - 1) * limit;
    const query = `SELECT
                               g.id,
                               g.community_id as "communityId",
                               g.name,
                               g.description,
                               g.rules,
                               g.cover_image as "coverImage",
                               g.logo,
                               g.is_public as "isPublic",
                               g.member_approval as "memberApprovalRequired",
                               g.post_approval as "postApprovalRequired",
                               g.created_at as "createdAt",
                               g.member_count as "memberCount"
                        FROM groups g WHERE id IN (SELECT group_id FROM group_members WHERE user_id = $1) LIMIT $2 OFFSET $3`;
    const values = [userId, limit, offset];
    
    const countQuery = `SELECT COUNT(*) FROM groups WHERE id IN (SELECT group_id FROM group_members WHERE user_id = $1)`;
    
    const groupsResult = await client.query(query, values);
    const countResult = await client.query(countQuery, [values[0]]);
    
    const totalGroups = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalGroups / limit);
    
    return {
        groups: groupsResult.rows,
        meta: {
            totalItems: totalGroups,
            itemsPerPage: limit,
            itemCount: groupsResult.rows.length,
            currentPage: page,
            totalPages: totalPages,
        }
    }
}

const getSuggestedGroups = async (client, userId, page, limit) => {
    const offset = (page - 1) * limit;
    
    const query = `
        SELECT
            g.id,
            g.community_id as "communityId",
            g.name,
            g.description,
            g.rules,
            g.cover_image as "coverImage",
            g.logo,
            g.is_public as "isPublic",
            g.member_approval as "memberApprovalRequired",
            g.post_approval as "postApprovalRequired",
            g.created_at as "createdAt",
            g.member_count as "memberCount"
        FROM groups g
        WHERE g.community_id IN (
            SELECT community_id
            FROM community_members
            WHERE user_id = $1
        )
        AND g.id NOT IN (
            SELECT group_id
            FROM group_members
            WHERE user_id = $1
        )
        AND g.id NOT IN (
            SELECT group_id
            FROM group_join_requests
            WHERE user_id = $1 AND status = 'pending'
        )
        AND g.is_public = true
        ORDER BY g.name
        LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
        SELECT COUNT(*) as count
        FROM groups g
        WHERE g.community_id IN (
            SELECT community_id
            FROM community_members
            WHERE user_id = $1
        )
        AND g.id NOT IN (
            SELECT group_id
            FROM group_members
            WHERE user_id = $1
        )
        AND g.id NOT IN (
            SELECT group_id
            FROM group_join_requests
            WHERE user_id = $1 AND status = 'pending'
        )
        AND g.is_public = true
    `;
    
    const values = [userId, limit, offset];
    
    try {
        const result = await client.query(query, values);
        const countResult = await client.query(countQuery, [userId]);
        
        const totalGroups = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalGroups / limit);
        
        return {
            groups: result.rows,
            meta: {
                totalItems: totalGroups,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        };
    } catch (err) {
        console.error('Error fetching suggested groups:', err);
        throw CustomError.internalServerError('Failed to retrieve suggested groups');
    }
};

const createGroup = async (client, groupData) => {
    const {
        name,
        description,
        rules,
        coverImage,
        logo,
        isPublic,
        memberApprovalRequired,
        postApprovalRequired,
        communityId,
        creatorId,
    } = groupData;

    const query = `INSERT INTO groups (
                        name, 
                        description, 
                        rules, 
                        cover_image, 
                        logo, 
                        is_public, 
                        member_approval, 
                        post_approval, 
                        community_id, 
                        created_by,
                        member_count
                    ) VALUES ($1, $2,$3, $4, $5, $6, $7, $8, $9, $10, 1) RETURNING *`;
    const values = [
                    name,
                    description,
                    rules,
                    coverImage,
                    logo,
                    isPublic,
                    memberApprovalRequired,
                    postApprovalRequired,
                    communityId,
                    creatorId
                ];

    try {
        // Create group
        const result = await client.query(query, values);
        if (result.rows.length === 0) return null;

        // Make group creator member of the group
        const joinReqQuery = `INSERT INTO group_join_requests 
                                    (group_id, user_id, responded_at, responded_by, status) 
                                    VALUES ($1, $2, now(), $3, $4) RETURNING *`;
        const joinReqValues = [result.rows[0].id, creatorId, creatorId, 'approved'];

        const memberQuery = `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`;
        const memberValues = [result.rows[0].id, creatorId];

        const joinReqResult = await client.query(joinReqQuery, joinReqValues);
        const memberResult = await client.query(memberQuery, memberValues);

        return result.rows[0];

    } catch (err) {
        console.error('Error creating group:', err);
        throw CustomError.internalServerError('Failed to create group');
    }
}

const findGroupByName = async (client, name, communityId) => {
    const query = `SELECT * FROM groups WHERE name = $1 AND community_id = $2`;
    const values = [name, communityId];
    const result = await client.query(query, values);
    return result.rows[0] || null;
}

const findGroupById = async (client, groupId) => {
    const query = `SELECT
                            g.id,
                            g.community_id as "communityId",
                            g.name,
                            g.description,
                            g.rules,
                            g.cover_image as coverImage,
                            g.logo,
                            g.is_public as isPublic,
                            g.member_approval as memberApprovalRequired,
                            g.post_approval as postApprovalRequired,
                            g.created_at as createdAt
                        FROM groups g
                        WHERE id = $1`;
    const values = [groupId];
    const result = await client.query(query, values);
    return result.rows[0] || null;
}

const updateGroupData = async (client, groupId, groupData) => {
    const {
        name,
        description,
        coverImage,
        logo,
        isPublic,
        memberApprovalRequired,
        postApprovalRequired,
    } = groupData;

    const query = `UPDATE groups SET name = $1, description = $2, cover_image = $3, logo = $4, is_public = $5, member_approval = $6, post_approval = $7 WHERE id = $8 RETURNING *`;
    const values = [
                    name,
                    description,
                    coverImage,
                    logo,
                    isPublic,
                    memberApprovalRequired,
                    postApprovalRequired,
                    groupId
    ]

    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error updating group', err);
        throw CustomError.internalServerError('Failed to update group');
    }
}

const deleteGroup = async (client, groupId) => {
    const query = `DELETE FROM groups WHERE id = $1 RETURNING *`;
    const values = [groupId];
    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error deleting group', err);
        throw CustomError.internalServerError('Failed to delete group');
    }
}

const getGroupMembers = async (client, page, limit, groupId) => {
    // Calculate offset
    const offset = (page - 1) * limit;

    // Create the query for getting member details
    const memberQuery = `
                        SELECT 
                            g.id AS "memberId", 
                            g.user_id AS "userId", 
                            g.group_id AS "groupId", 
                            g.role, 
                            g.joined_at AS "joinedAt", 
                            u.username,
                            u.email,
                            up.first_name AS "firstName",
                            up.lASt_name AS "lastName",
                            up.profile_picture AS "profilePicture",
                            up.bio AS bio,
                            univ.name AS "universityName",
                            univ.logo_url AS "universityLogoUrl"
                        FROM group_members g
                        LEFT JOIN users u ON g.user_id = u.id
                        LEFT JOIN user_profiles up ON u.id = up.user_id
                        LEFT JOIN universities univ ON u.university_id = univ.id
                        WHERE g.group_id = $1
                        ORDER BY g.joined_at DESC
                        LIMIT $2 OFFSET $3`;
    const memberQueryValues = [groupId, limit, offset];

    // Query for counting total members in the group
    const countQuery = `SELECT COUNT(*) FROM group_members WHERE group_id = $1`;

    try {
        const result = await client.query(memberQuery, memberQueryValues);
        const countResult = await client.query(countQuery, [groupId]);

        // Total group members and total number of pages
        const totalMembers = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalMembers / limit);

        return {
            members: result.rows,
            meta: {
                totalItems: totalMembers,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        }
    } catch (err) {
        console.error('Error fetching group members', err);
        throw CustomError.internalServerError('Failed to fetch group members');
    }
}

const updateGroupMemberRole = async (client, groupId, userId, role) => {
    const query = `UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3 RETURNING *`;
    const values = [role, groupId, userId];

    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error updating group member role', err);
        throw CustomError.internalServerError('Failed to update group member role');
    }
}

const removeMemberFromGroup = async (client, groupId, userId) => {
    const groupMemberQuery = `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *`;
    const values = [groupId, userId];

    const groupJoinRequestQuery = `DELETE FROM group_join_requests WHERE group_id = $1 AND user_id = $2 RETURNING *`;

    try {
        const result = await client.query(groupMemberQuery, values);
        const groupJoinRequestResult = await client.query(groupJoinRequestQuery, values);
        
        if (result.rows.length === 0 && groupJoinRequestResult.rows.length === 0) return null;
        
        await client.query("UPDATE groups SET member_count = member_count - 1 WHERE id = $1", [result.rows[0]["group_id"]]);
        
        return (result.rows.length > 0 && groupJoinRequestResult.rows.length > 0);
    } catch (err) {
        console.error('Error removing member from group', err);
        throw CustomError.internalServerError('Failed to remove member from group');
    }
}

const joinGroup = async (client, groupId, userId) => {
    const query = `INSERT INTO group_join_requests (group_id, user_id) VALUES ($1, $2) RETURNING *`;
    const values = [groupId, userId];

    try {
        // Check if user is in the group's community
        const checkUserInCommunity = `
                        SELECT * 
                        FROM community_members 
                        WHERE user_id = $1 AND community_id = (SELECT community_id FROM groups WHERE id = $2)`;
        const checkUserInCommunityValues = [userId, groupId];
        const checkUserInCommunityResult = await client.query(checkUserInCommunity, checkUserInCommunityValues);
        if (checkUserInCommunityResult.rows.length === 0) {
            return null;
        }

        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Failed to send group join request");
        throw CustomError.internalServerError("Failed to send group join request");
    }
}

const leaveGroup = async (client, groupId, userId) => {
    // Check if user has sent any group request or not
    // If sent then was he approved or not
    // If pending then remove from group request
    // If approved then remove from both group request and group member

    const checkUserInGroupReq = `SELECT * FROM group_join_requests WHERE group_id = $1 AND user_id = $2`;
    const values = [groupId, userId];
    const result = await client.query(checkUserInGroupReq, values);
    if (result.rows.length === 0) {
        return null;
    }

    const reqStatus = result.rows[0].status;
    let delResult;
    if (reqStatus === 'pending') {
        const deleteReq = `DELETE FROM group_join_requests WHERE group_id = $1 AND user_id = $2 RETURNING *`;
        delResult = await client.query(deleteReq, values);
    } else if (reqStatus === 'approved') {
        const deleteReq = `DELETE FROM group_join_requests WHERE group_id = $1 AND user_id = $2 RETURNING *`;
        delResult = client.query(deleteReq, values);

        const deleteMember = `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *`;
        delResult = await client.query(deleteMember, values);
        
        await client.query("UPDATE groups SET member_count = member_count - 1 WHERE id = $1", [result.rows[0]["group_id"]]);
    }

    return delResult.rows[0] || null;
}

const getGroupJoinRequests = async (client, page, limit, groupId) => {
    const offset = (page - 1) * limit;
    const query = `
        SELECT 
            gjr.id as "requestId", 
            gjr.group_id as "groupId", 
            gjr.user_id as "userId", 
            gjr.status, 
            gjr.requested_at as "requestedAt", 
            u.username,
            u.email,
            up.first_name as "firstName",
            up.last_name as "lastName",
            up.profile_picture as "profilePicture",
            up.bio,
            univ.name as "universityName",
            univ.logo_url as "universityLogoUrl"
        FROM group_join_requests gjr
        LEFT JOIN users u ON gjr.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN universities univ ON u.university_id = univ.id
        WHERE gjr.group_id = $1
        ORDER BY gjr.requested_at DESC
        LIMIT $2 OFFSET $3
    `;
    const values = [groupId, limit, offset];

    try {
        const result = await client.query(query, values);
        const countQuery = `SELECT COUNT(*) FROM group_join_requests WHERE group_id = $1`;
        const countResult = await client.query(countQuery, [groupId]);

        const totalRequests = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalRequests / limit);

        return {
            requests: result.rows,
            meta: {
                totalItems: totalRequests,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        }
    } catch {
        console.error("Failed to fetch group join requests");
        throw CustomError.internalServerError("Failed to fetch group join requests");
    }
}

const approveJoinRequest = async (client, requestId, approverId) => {
    // Query for approving the join request
    const approveQuery = `UPDATE group_join_requests SET status = 'approved', responded_by = $2, responded_at = now() WHERE id = $1 RETURNING *`;
    const values = [requestId, approverId];

    try {
        const result = await client.query(approveQuery, values);
        if (result.rows.length === 0) return null;
        
        // Query for adding the user as the member
        const memberQuery = `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') RETURNING *`;
        const memberValues = [result.rows[0]["group_id"], result.rows[0]["user_id"]];
        
        

        const memberResult = await client.query(memberQuery, memberValues);
        if (memberResult.rows.length === 0) return null;
        
        await client.query("UPDATE groups SET member_count = member_count + 1 WHERE id = $1", [result.rows[0]["group_id"]]);

        return memberResult.rows[0];
    } catch (err) {
        console.error('Error approving group join request', err);
        throw CustomError.internalServerError('Failed to approve group join request');
    }
}

const rejectJoinRequest = async (client, requestId, rejectorId, reason) => {
    // Query for rejecting user join request
    const query = `UPDATE group_join_requests SET status = 'rejected', responded_by = $2, responded_at = now(), rejectionreason = $3 WHERE id = $1 RETURNING group_id as groupId, user_id as userId`;
    const values = [requestId, rejectorId, reason];

    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;

    } catch (err) {
        console.error('Error rejecting group join request', err);
        throw CustomError.internalServerError('Failed to reject group join request');
    }
}

const findGroupMemberById = async (client, groupId, memberId) => {
    const query = `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`;
    const values = [groupId, memberId];
    const result = await client.query(query, values);
    return result.rows[0] || null;
}

module.exports = {
    getALlGroups,
    getAllGroupsForUser,
    getSuggestedGroups,
    createGroup,
    findGroupByName,
    findGroupById,
    updateGroupData,
    deleteGroup,
    getGroupMembers,
    updateGroupMemberRole,
    removeMemberFromGroup,
    joinGroup,
    leaveGroup,
    getGroupJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    findGroupMemberById
}