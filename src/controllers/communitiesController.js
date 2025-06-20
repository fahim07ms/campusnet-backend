const pool = require('../config/db');

const {
    getAllCommunities,
    createNewCommunity,
    getCommunityById,
    updateCommunity,
    getUserCommunity,
    getAllCommunityMembers,
    addCommunityMember,
    getMemberDetailsById,
    updateMemberRole,
    deleteMember
} = require('../models/communitiesModel');
const { badRequest, notFound, forbidden, conflict, internalServerError } = require('../utils/errors');


/**
 * Get a list of all communities
 * GET /communities
 */
const getCommunities = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, universityId, sort } = req.query;
        
        const communitiesData = await getAllCommunities(
            parseInt(page), 
            parseInt(limit), 
            search, 
            universityId,
            sort
        );
        
        return res.status(200).json({
            message: "Communities retrieved successfully",
            data: {
                communities: communitiesData.communities,
                meta: {
                    totalItems: communitiesData.totalItems,
                    itemCount: communitiesData.itemCount,
                    itemsPerPage: parseInt(limit),
                    totalPages: Math.ceil(communitiesData.totalItems / limit),
                    currentPage: parseInt(page),
                }
            }
        });
    } catch (error) {
        console.error('Error in getCommunities controller:', error);
        res.status(500).json(
            internalServerError({
                message: "Failed to retrieve communities. Please try again later.",
                details: {
                    error: error.message,
                }
            }),
        );
    }
};

/**
 * Create a new community
 * POST /communities
 */
const createCommunity = async (req, res, next) => {
    const client = await pool.connect();
    try {
        // Get data from the request body
        let { name, description, rules, universityId, coverImage, logo, isPublic, creatorId } = req.body;

        await client.query("BEGIN");

        // If user didn't provided university id, then get from user's id
        let creatorUniversity;
        if (!universityId) {
            console.log(creatorId);
           creatorUniversity = await client.query("SELECT university_id FROM users WHERE id = $1", [creatorId]);
           universityId = creatorUniversity.rows[0]["university_id"];
           console.log(universityId);
        }

        // Get university data
        const universityData = await client.query("SELECT * FROM universities WHERE id = $1", [universityId]);
        const university = universityData.rows[0];

        // Create community data
        // If name, description and logo not provided use it from university
        const communityData = {
            name: name || university.name,
            description: description || university.description,
            universityId,
            rules,
            coverImage,
            logo: logo || university["logo_url"],
            isPublic: isPublic !== undefined ? isPublic : true,
            creatorId
        };

        // Create community SQL
        const newCommunity = await createNewCommunity(client, communityData);

        await client.query("COMMIT");
        return res.status(201).json({
            message: "Community created successfully",
            data: {
                community: newCommunity
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error('Error in createCommunity controller:', error);
        if (error.code === '23505') { // Unique violation in PostgreSQL
            return res.status(409).json(
                conflict({
                    message: "A community with this name already exists",
                })
            );
        } else {
            return res.status(500).json(
                internalServerError({
                    message: "Failed to create community. Please try again later.",
                    details: {
                        error: error.message,
                    }
                }),
            );
        }
    } finally {
        if (client) {
            await client.release();
        }
    }
};

/**
 * Get details for a specific community
 * GET /communities/:id
 */
const getCommunityDetails = async (req, res, next) => {
    const client = await pool.connect();
    try {
        // Get id from parameters and retrieve commnunity details
        const { id } = req.params;
        const community = await getCommunityById(client, id);

        // If not found throw error
        if (!community) {
            return res.status(404).json(
                notFound({
                    message: "Community not found"
                })
            );
        }
        
        return res.status(200).json({
            message: "Community details retrieved successfully",
            data: {
                community
            }
        });
    } catch (error) {
        console.error('Error in getCommunityDetails controller:', error);
        return res.status(500).json(internalServerError({
            message: "Failed to retrieve community details. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    } finally {
        await client.release();
    }
};

/**
 * Update details for a specific community
 * PUT /communities/:id
 */
const updateCommunityDetails = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { name, description, rules, coverImage, logo, isPublic, postApproval } = req.body;

        await client.query("BEGIN");
        // Check if community exists
        const community = await getCommunityById(client, id);
        
        if (!community) {
            return res.status(404).json(
                notFound({
                    message: "Community not found"
                })
            );
        }

        // Check if user is authorized to update this community
        const memberDetails = await getMemberDetailsById(client, id, userId);
        if ((!memberDetails || memberDetails?.role !== 'admin')) {
            return res.status(403).json(forbidden({
                message: "You do not have permission to update this community"
            }))
        }
        
        // Only update fields that are provided
        const updates = {};
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (rules) updates.rules = rules;
        if (postApproval) updates.postApproval = postApproval;
        if (coverImage) updates.coverPhotoUrl = coverImage;
        if (logo) updates.logoUrl = logo;
        if (isPublic) updates.isPublic = isPublic;
        
        const updatedCommunity = await updateCommunity(client, id, updates);

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Community updated successfully",
            data: {
                community: updatedCommunity
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error('Error in updateCommunityDetails controller:', error);
        return res.status(500).json(internalServerError({
            message: "Failed to update community details. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    } finally {
        await client.release();
    }
};

/**
 * Get communities for the logged-in user
 * GET /communities/my
 */
const myCommunityDetails = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const userId = req.userId;
        
        const communities = await getUserCommunity(client, userId);
        
        return res.status(200).json({
            message: "User communities retrieved successfully",
            data: {
                communities
            }
        });
    } catch (error) {
        console.error('Error in myCommunityDetails controller:', error);
        return res.status(500).json(internalServerError({
            message: "Failed to retrieve user communities. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    } finally {
        await client.release();
    }
};

/**
 * Get a list of members for a specific community
 * GET /communities/:id/members
 */
const getCommunityMembers = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, search, role } = req.query;
        
        // Check if community exists
        const community = await getCommunityById(client, id);
        
        if (!community) {
            return res.status(404).json(
                notFound({
                    message: "Community not found"
                })
            );
        }
        
        const members = await getAllCommunityMembers(
            client,
            id, 
            parseInt(page), 
            parseInt(limit),
            search,
            role
        );
        
        return res.status(200).json({
            message: "Community members retrieved successfully",
            data: {
                members: members.members,
                meta: {
                    totalItems: members.totalItems,
                    itemCount: members.itemCount,
                    itemsPerPage: parseInt(limit),
                    totalPages: Math.ceil(members.totalItems / limit),
                    currentPage: parseInt(page),
                }
            }
        });
    } catch (error) {
        console.error('Error in getCommunityMembers controller:', error);
        return res.status(500).json(internalServerError({
            message: "Failed to retrieve community members. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    }
};

/**
 * Send a join request to a community
 * POST /communities/:id/members
 */
const communityJoinRequest = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { role } = req.body;

        await client.query("BEGIN");
        // Check if community exists
        const community = await getCommunityById(client, id);
        
        if (!community) {
            return res.status(404).json(notFound({
                message: "Community not found"
            }))
        }
        
        // Add member (defaults to 'member' role if not specified)
        const memberData = {
            userId,
            communityId: id,
            role: role || 'member'
        };
        
        const joinRequest = await addCommunityMember(client, memberData);

        await client.query("COMMIT");
        return res.status(201).json({
            message: "Join request submitted successfully",
            data: {
                member: joinRequest
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error('Error in communityJoinRequest controller:', error);
        if (error.code === '23505') { // Unique violation in PostgreSQL
            return res.status(409).json(conflict({
                message: "You are already a member of this community",
                details: {
                    error: error.message,
                }
            }))
        } else {
            return res.status(500).json(internalServerError({
                message: "Failed to submit join request. Please try again later.",
                details: {
                    error: error.message,
                }
            }))
        }
    } finally {
        await client.release();
    }
};

/**
 * Get details for a specific community member
 * GET /communities/:id/members/:userId
 */
const getCommunityMemberDetails = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id, userId } = req.params;
        
        // Check if community exists
        const community = await getCommunityById(client, id);
        
        if (!community) {
            return res.status(404).json(notFound({
                message: "Community not found"
            }))
        }

        const memberDetails = await getMemberDetailsById(client, id, userId);

        if (!memberDetails) {
            return res.status(404).json(notFound({
                message: "Member not found in this community",
            }))
        }
        
        return res.status(200).json({
            message: "Member details retrieved successfully",
            data: {
                member: memberDetails
            }
        });
    } catch (error) {
        console.error('Error in getCommunityMemberDetails controller:', error);
        return res.status(500).json(internalServerError({
            message: "Member details could not be retrieved. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    } finally {
        await client.release();
    }
};

/**
 * Update role for a specific community member
 * PUT /communities/:id/members/:userId
 */
const updateCommunityMemberDetails = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id, userId } = req.params;
        const requesterId = req.userId;
        const { role } = req.body;
        
        if (!role) {
            return res.status(400).json(badRequest({
                message: "Role is required!"
            }))
        }

        await client.query("BEGIN");
        // Check if community exists
        const community = await getCommunityById(client, id);
        
        if (!community) {
            return res.status(404).json(notFound({
                message: "Community not found"
            }))
        }
        
        // Check if requester is the community admin
        const memberDetails = await getMemberDetailsById(client, id, requesterId);
        if ((!memberDetails || memberDetails?.role !== 'admin')) {
            return res.status(403).json(forbidden({
                message: "You do not have permission to update this"
            }))
        }

        // Update
        const updatedMember = await updateMemberRole(client, id, userId, role);

        if (!updatedMember) {
            return res.status(404).json(notFound({
                message: "Member does not exist in this community!"
            }))
        }

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Member role updated successfully",
            data: {
                member: updatedMember
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error('Error in updateCommunityMemberDetails controller:', error);
        return res.status(500).json(internalServerError({
            message: "Failed to update member role. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    } finally {
        await client.release();
    }
};

/**
 * Remove a member from a community
 * DELETE /communities/:id/members/:userId
 */
const removeCommunityMember = async (req, res, next) => {
    const client = pool.connect();
    try {
        const { id, userId } = req.params;
        const requesterId = req.userId;
        
        // Check if community exists
        const community = await getCommunityById(client, id);
        
        if (!community) {
            return res.status(404).json(notFound({
                message: "Community not found"
            }))
        }
        
        // Check if user is authorized to remove members
        // Either the community admin or the user themselves can remove
        const memberDetails = await getMemberDetailsById(client, id, requesterId);
        if ((!memberDetails || memberDetails?.role !== 'admin') || userId !== requesterId) {
            return res.status(403).json(forbidden({
                message: "You do not have permission to update this"
            }))
        }
        
        const result = await deleteMember(client, id, userId);
        
        if (!result) {
            return res.status(404).json(notFound({
                message: "Member not found in the community"
            }))
        }
        
        return res.status(200).json({
            message: "Member removed successfully"
        });
    } catch (error) {
        console.error('Error in removeCommunityMember controller:', error);
        return res.status(500).json(internalServerError({
            message: "Failed to remove member. Please try again later.",
            details: {
                error: error.message,
            }
        }))
    } finally {
        await client.release();
    }
};

module.exports = {
    getCommunities,
    createCommunity,
    getCommunityDetails,
    updateCommunityDetails,
    myCommunityDetails,
    getCommunityMembers,
    communityJoinRequest,
    getCommunityMemberDetails,
    updateCommunityMemberDetails,
    removeCommunityMember
};