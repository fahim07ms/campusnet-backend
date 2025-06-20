const pool = require('../config/db');

/**
 * Get all communities with filtering, sorting, and pagination
 */
const getAllCommunities = async (page, limit, search, universityId, sort) => {
    const client = await pool.connect();
    try {
        // How many rows to skip before starting
        const offset = (page - 1) * limit;

        // Initial query
        let query = `SELECT * FROM communities c`;

        // Add search conditions
        const conditions = [];

        // List for query parameters
        const params = [];

        // Index of query parameters
        let paramIndex = 1;

        // If there is something to search build query part for that searching
        if (search) {
            conditions.push(`(c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        // If there is particular university id then build query part for that
        if (universityId) {
            conditions.push(`c.university_id = $${paramIndex}`);
            params.push(universityId);
            paramIndex++;
        }

        // If above two condition apply then add `WHERE` clause and `AND` clause if both them are applied
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Group by and sort
        query += ` GROUP BY c.id`;

        // Add sorting logic
        if (sort) {
            let sortField = 'c.created_at';
            let sortOrder = 'DESC';

            if (sort === 'name_asc') {
                sortField = 'c.name';
                sortOrder = 'ASC';
            } else if (sort === 'name_desc') {
                sortField = 'c.name';
                sortOrder = 'DESC';
            } else if (sort === 'members_asc') {
                sortField = 'member_count';
                sortOrder = 'ASC';
            } else if (sort === 'members_desc') {
                sortField = 'member_count';
                sortOrder = 'DESC';
            } else if (sort === 'newest') {
                sortOrder = 'DESC';
            } else if (sort === 'oldest') {
                sortOrder = 'ASC';
            }

            query += ` ORDER BY ${sortField} ${sortOrder}`;
        }

        // Add pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(DISTINCT c.id)
            FROM communities c
        `;

        // Same adding of `WHERE` and `AND` clause like previous query string
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }

        // Execute queries
        const countResult = await client.query(countQuery, params.slice(0, paramIndex - 1));
        const result = await client.query(query, params);

        // Format communities according to the Community schema
        const communities = result.rows.map(community => ({
            id: community.id,
            universityId: community["university_id"],
            name: community.name,
            description: community.description,
            logoUrl: community["logo_url"],
            coverPhotoUrl: community["cover_image"],
            isPublic: community["is_public"],
            memberCount: parseInt(community["member_count"]),
            createdBy: community["created_by"],
            createdAt: community["created_at"],
            updatedAt: community["updated_at"]
        }));

        return {
            communities,
            totalItems: parseInt(countResult.rows[0].count),
            itemCount: result.rows.length
        };
    } catch (error) {
        console.error('Error in getAllCommunities:', error);
        throw error;
    }
};

/**
 * Create a new community
 */
const createNewCommunity = async (client, communityData) => {
    try {
        const { name, description, rules, universityId, coverImage, logo, isPublic, creatorId } = communityData;
        
        const query = `
            INSERT INTO communities (
                name, 
                description, 
                rules,
                university_id, 
                cover_image, 
                logo, 
                is_public, 
                created_by
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const result = await client.query(query, [
            name, 
            description,
            rules,
            universityId, 
            coverImage, 
            logo, 
            isPublic, 
            creatorId
        ]);
        
        // Also add creator as admin member
        await client.query(
            `INSERT INTO community_members (community_id, user_id, role) 
             VALUES ($1, $2, 'admin')`,
            [result.rows[0].id, creatorId]
        );
        
        // Return community with the format matching the Community schema
        return {
            id: result.rows[0].id,
            universityId: result.rows[0]["university_id"],
            name: result.rows[0].name,
            description: result.rows[0].description,
            logoUrl: result.rows[0]["logo_url"],
            coverPhotoUrl: result.rows[0]["cover_photo_url"],
            isPublic: result.rows[0]["is_public"],
            memberCount: 1, // Initially only the creator
            createdBy: result.rows[0]["created_by"],
            createdAt: result.rows[0]["created_by"],
            updatedAt: result.rows[0]["updated_at"],
        };
    } catch (error) {
        console.error('Error in createNewCommunity:', error);
        throw error;
    }
};

/**
 * Get a community by ID
 */
const getCommunityById = async (client, communityId) => {
    try {
        // Find out the community with given id
        const query = `
            SELECT * FROM communities c WHERE c.id = $1
        `;
        const result = await client.query(query, [communityId]);

        // If no community found, return null
        if (result.rows.length === 0) return null;

        const community = result.rows[0];
        // Format community according to the Community schema
        return {
            id: community.id,
            universityId: community["university_id"],
            name: community.name,
            description: community.description,
            rules: community.rules,
            logoUrl: community["logo_url"],
            coverPhotoUrl: community["cover_image"],
            isPublic: community["is_public"],
            post_approval: community["post_approval"],
            memberCount: parseInt(community["member_count"]),
            createdBy: community["created_by"],
            createdAt: community["created_at"],
            updatedAt: community["updated_at"],
        };
    } catch (error) {
        console.error('Error in getCommunityById:', error);
        throw error;
    }
};

/**
 * Update a community
 */
const updateCommunity = async (client, communityId, updates) => {
    try {
        // Construct SET part of query dynamically based on provided updates
        const allowedFields = [
            'name',
            'description',
            'rules',
            'logoUrl',
            'coverPhotoUrl',
            'isPublic',
            'postApproval'
        ];

        // Query details related variables
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        // Map JavaScript camelCase to database snake_case
        const fieldMapping = {
            'name': 'name',
            'description': 'description',
            'rules': 'rules',
            'logoUrl': 'logo_url',
            'coverPhotoUrl': 'cover_photo_url',
            'isPublic': 'is_public',
            'postApproval': 'post_approval'
        };

        // Add query field values and params in their respective variables
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                const dbField = fieldMapping[key];
                setValues.push(`${dbField} = $${paramIndex}`);
                queryParams.push(value);
                paramIndex++;
            }
        }

        // If no valid updates, return the current community
        if (setValues.length === 0) {
            return getCommunityById(client, communityId);
        }

        // Build and execute query
        const query = `
            UPDATE communities
            SET ${setValues.join(', ')}
            WHERE id = $${paramIndex} RETURNING *`;

        // Push the community id
        queryParams.push(communityId);

        await client.query(query, queryParams);

        // Return full community details
        return getCommunityById(client, communityId);
    } catch (error) {
        console.error('Error in updateCommunity:', error);
        throw error;
    }
};

/**
 * Get communities for a specific user
 */
const getUserCommunity = async (client, userId) => {
    try {
        // Get community id using user id
        let query = `
            SELECT community_id FROM community_members WHERE user_id = $1
        `;

        const result = await client.query(query, [userId]);
        if (result.rows.length === 0) {
            return null;
        }

        return getCommunityById(client, result.rows[0]["community_id"]);
    } catch (error) {
        console.error('Error in getUserCommunity:', error);
        throw error;
    }
};

/**
 * Get all members of a community with pagination
 */
const getAllCommunityMembers = async (client, communityId, page, limit, search, role) => {
    try {
        const offset = (page - 1) * limit;

        // Initial query part
        let query = `
            SELECT cm.community_id as communityId,
                   cm.role,
                   cm.joined_at as joinedAt,
                   u.id as userId,
                   u.username,
                   u.email,
                   u.is_active as isActive,
                   up.first_name as firstName,
                   up.last_name as lastName,
                   up.bio,
                   up.profile_picture as profilePicture,
                   up.cover_photo as coverPhoto,
                   up.department,
                   up.interests,
                   up.profile_visibility_public as profileVisibilityPublic,
                   up.connection_visibility_public as connectionVisibilityPublic
            FROM community_members cm
            LEFT JOIN users u ON cm.user_id = u.id
            LEFT JOIN user_profiles up ON cm.user_id = up.user_id
            WHERE cm.community_id = $1
        `;

        // Array for query parameters and its count variable
        const queryParams = [communityId];
        let paramIndex = 2;

        // If role filter used
        if (role) {
            query += ` AND cm.role = $${paramIndex}`;
            queryParams.push(role);
            paramIndex++;
        }

        if (search) {
            query += ` AND (u.username ILIKE $${paramIndex} OR up.first_name ILIKE $${paramIndex} OR up.last_name ILIKE $${paramIndex} OR up.bio ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        // Add sorting and pagination
        query += ` ORDER BY CASE WHEN cm.role = 'admin' THEN 1 ELSE 2 END, cm.joined_at ASC`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        // Create a separate array for count query parameters
        const countParams = [communityId];
        let countParamIndex = 2;


        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*)
            FROM community_members cm
            LEFT JOIN users u ON cm.user_id = u.id
            LEFT JOIN user_profiles up ON cm.user_id = up.user_id
            WHERE cm.community_id = $1
        `;

        if (role) {
            countQuery += ` AND cm.role = $${countParamIndex}`;
            countParams.push(role);
            countParamIndex++;
        }

        if (search) {
            countQuery += ` AND (u.username ILIKE $${countParamIndex} OR up.first_name ILIKE $${countParamIndex} OR up.last_name ILIKE $${countParamIndex} OR up.bio ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
            countParamIndex++;
        }

        // Execute queries
        const countResult = await client.query(countQuery, countParams);
        const result = await client.query(query, queryParams);

        // Format members according to the CommunityMember schema
        const members = result.rows.map(member => ({
            user: {
                id: member.userId,
                username: member.username,
                email: member.email,
                isActive: member.isActive,
                firstName: member.firstName,
                lastName: member.lastName,
                profilePicture: member.profilePicture,
                coverPhoto: member.coverPhoto,
                bio: member.bio,
                department: member.department,
                interests: member.interests,
                profileVisibilityPublic: member.profileVisibilityPublic,
                connectionVisibilityPublic: member.connectionVisibilityPublic,
            },
            communityId: member["community_id"],
            role: member.role,
            joinedAt: member.joinedAt,
        }));

        return {
            members,
            totalItems: parseInt(countResult.rows[0].count),
            itemCount: result.rows.length
        };
    } catch (error) {
        console.error('Error in getAllCommunityMembers:', error);
        throw error;
    }
};

/**
 * Add a member to a community
 */
const addCommunityMember = async (client, memberData) => {
    try {
        const { userId, communityId, role } = memberData;

        // Add member
        const query = `
            INSERT INTO community_members (
                community_id,
                user_id,
                role,
                joined_at
            )
            VALUES ($1, $2, $3, NOW())
            RETURNING *
        `;

        const result = await client.query(query, [communityId, userId, role]);

        return await getMemberDetailsById(client, communityId, userId);
    } catch (error) {
        console.error('Error in addCommunityMember:', error);
        throw error;
    }
};

// /**
//  * Get details of a specific member in a community
//  */
const getMemberDetailsById = async (client, communityId, userId) => {
    try {
        const query = `
            SELECT cm.community_id as communityId,
                   cm.role,
                   cm.joined_at as joinedAt,
                   u.id as userId,
                   u.username,
                   u.email,
                   u.is_active as isActive,
                   up.first_name as firstName,
                   up.last_name as lastName,
                   up.bio,
                   up.profile_picture as profilePicture,
                   up.cover_photo as coverPhoto,
                   up.department,
                   up.interests,
                   up.profile_visibility_public as profileVisibilityPublic,
                   up.connection_visibility_public as connectionVisibilityPublic
            FROM community_members cm
            LEFT JOIN users u ON cm.user_id = u.id
            LEFT JOIN user_profiles up ON cm.user_id = up.user_id
            WHERE cm.community_id = $1 AND cm.user_id = $2
        `;
        const result = await client.query(query, [communityId, userId]);
        console.log(communityId, userId, result.rows);
        if (result.rows.length === 0) {
            return null;
        }

        const member = result.rows[0];

        // Format according to the CommunityMember schema
        return {
            user: {
                id: member.userId,
                username: member.username,
                email: member.email,
                isActive: member.isActive,
                firstName: member.firstName,
                lastName: member.lastName,
                profilePicture: member.profilePicture,
                coverPhoto: member.coverPhoto,
                bio: member.bio,
                department: member.department,
                interests: member.interests,
                profileVisibilityPublic: member.profileVisibilityPublic,
                connectionVisibilityPublic: member.connectionVisibilityPublic,
            },
            communityId: member["community_id"],
            role: member.role,
            joinedAt: member.joinedAt,
        };
    } catch (error) {
        console.error('Error in getMemberDetailsById:', error);
        throw error;
    }
};

/**
 * Update member role in a community
 */
const updateMemberRole = async (client, communityId, userId, role) => {
    try {
        // Check if the member exists
        const checkQuery = `
            SELECT * FROM community_members
            WHERE community_id = $1 AND user_id = $2
        `;

        const checkResult = await client.query(checkQuery, [communityId, userId]);

        if (checkResult.rows.length === 0) {
            return null;
        }

        // Update member role
        const query = `
            UPDATE community_members
            SET role = $3
            WHERE community_id = $1 AND user_id = $2
            RETURNING *
        `;

        await client.query(query, [communityId, userId, role]);

        // Return updated member details
        return getMemberDetailsById(client, communityId, userId);
    } catch (error) {
        console.error('Error in updateMemberRole:', error);
        throw error;
    }
};

/**
 * Remove a member from a community
 */
const deleteMember = async (client, communityId, userId) => {
    try {
        // Check if the member exists
        const checkQuery = `
            SELECT * FROM community_members
            WHERE community_id = $1 AND user_id = $2
        `;

        const checkResult = await client.query(checkQuery, [communityId, userId]);

        if (checkResult.rows.length === 0) {
            return null;
        }

        // Delete member
        const query = `
            DELETE FROM community_members
            WHERE community_id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await client.query(query, [communityId, userId]);

        return result.rows[0];
    } catch (error) {
        console.error('Error in deleteMember:', error);
        throw error;
    }
};

module.exports = {
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
};