const pool = require('../config/db');
const CustomError = require("../utils/errors");

const getALlGroups = async (client, page, limit, communityId) => {
    const offset = (page - 1) * limit;

    // Make initial query and parameters
    let query = `SELECT * FROM groups ORDER BY name LIMIT $1 OFFSET $2`;
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
                        created_by
                    ) VALUES ($1, $2,$3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
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
        const result = await client.query(query, values);
        return result.rows[0] || null;
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

module.exports = {
    getALlGroups,
    createGroup,
    findGroupByName,
    findGroupById,
    updateGroupData,
}