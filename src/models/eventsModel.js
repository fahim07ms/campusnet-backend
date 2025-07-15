const pool = require('../config/db');
const CustomError = require("../utils/errors");

const createEvent = async (client, eventData) => {
    const {
        title,
        description,
        communityId,
        groupId,
        startDate,
        endDate,
        location,
        venueDetails,
        eventLink,
        maxAttendees,
        coverImage,
        isPublic,
        status,
        organizerId,
    } = eventData;

    const query = `
        INSERT INTO events (
            title,
            description,
            community_id,
            group_id,
            start_date,
            end_date,
            location,
            venue_details,
            event_link,
            max_attendees,
            cover_image,
            is_public,
            status,
            organizer_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;

    const values = [
        title,
        description,
        communityId,
        groupId,
        startDate,
        endDate,
        location,
        venueDetails,
        eventLink,
        maxAttendees,
        coverImage,
        isPublic,
        status,
        organizerId
    ];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error creating event:', err);
        throw CustomError.internalServerError('Failed to create event');
    }
};

const getAllEvents = async (client, page, limit, communityId, groupId) => {
    const offset = (page - 1) * limit;

    // Make initial query and parameters
    let query = `
        SELECT 
            e.id,
            e.title,
            e.description,
            e.community_id as "communityId",
            e.group_id as "groupId",
            e.start_date as "startDate",
            e.end_date as "endDate",
            e.location,
            e.venue_details as "venueDetails",
            e.event_link as "eventLink",
            e.max_attendees as "maxAttendees",
            e.cover_image as "coverImage",
            e.is_public as "isPublic",
            e.status,
            e.created_at as "createdAt",
            e.updated_at as "updatedAt",
            u.username as "organizerUsername",
            u.email as "organizerEmail",
            up.first_name as "organizerFirstName",
            up.last_name as "organizerLastName",
            up.profile_picture as "organizerProfilePicture",
            e.attending_count as "attendeeCount",
            e.interested_count as "interestedCount"
        FROM events e
        LEFT JOIN users u ON e.organizer_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        ORDER BY e.created_at DESC
        LIMIT $1 OFFSET $2`;

    let countQuery = `SELECT COUNT(*) FROM events`;
    let params = [limit, offset];

    // Filter by community if provided
    if (communityId) {
        query = `
            SELECT 
                e.id,
                e.title,
                e.description,
                e.community_id as "communityId",
                e.group_id as "groupId",
                e.start_date as "startDate",
                e.end_date as "endDate",
                e.location,
                e.venue_details as "venueDetails",
                e.event_link as "eventLink",
                e.max_attendees as "maxAttendees",
                e.cover_image as "coverImage",
                e.is_public as "isPublic",
                e.status,
                e.created_at as "createdAt",
                e.updated_at as "updatedAt",
                u.username as "organizerUsername",
                u.email as "organizerEmail",
                up.first_name as "organizerFirstName",
                up.last_name as "organizerLastName",
                up.profile_picture as "organizerProfilePicture",
                e.attending_count as "attendeeCount",
                e.interested_count as "interestedCount"
            FROM events e
            LEFT JOIN users u ON e.organizer_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE e.community_id = $3
            ORDER BY e.created_at DESC
            LIMIT $1 OFFSET $2`;
        countQuery = `SELECT COUNT(*) FROM events WHERE community_id = $1`;
        params.push(communityId);
    }

    // Filter by group if provided
    if (groupId) {
        query = `
            SELECT 
                e.id,
                e.title,
                e.description,
                e.community_id as "communityId",
                e.group_id as "groupId",
                e.start_date as "startDate",
                e.end_date as "endDate",
                e.location,
                e.venue_details as "venueDetails",
                e.event_link as "eventLink",
                e.max_attendees as "maxAttendees",
                e.cover_image as "coverImage",
                e.is_public as "isPublic",
                e.status,
                e.created_at as "createdAt",
                e.updated_at as "updatedAt",
                u.username as "organizerUsername",
                u.email as "organizerEmail",
                up.first_name as "organizerFirstName",
                up.last_name as "organizerLastName",
                up.profile_picture as "organizerProfilePicture",
                e.attending_count as "attendeeCount",
                e.interested_count as "interestedCount"
                FROM events e
            LEFT JOIN users u ON e.organizer_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE e.group_id = $3
            ORDER BY e.created_at DESC
            LIMIT $1 OFFSET $2`;
        countQuery = `SELECT COUNT(*) FROM events WHERE group_id = $1`;
        params.push(groupId);
    }

    try {
        const eventsResult = await client.query(query, params);
        const countResult = (communityId || groupId) ?
            await client.query(countQuery, [communityId || groupId]) :
            await client.query(countQuery);

        const totalEvents = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalEvents / limit);

        return {
            events: eventsResult.rows,
            meta: {
                totalItems: totalEvents,
                itemsPerPage: limit,
                itemCount: eventsResult.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        };
    } catch (err) {
        console.error('Error fetching events:', err);
        throw CustomError.internalServerError('Failed to retrieve events');
    }
};

const findEventById = async (client, eventId) => {
    const query = `
        SELECT 
            e.id,
            e.title,
            e.description,
            e.community_id as "communityId",
            e.group_id as "groupId",
            e.start_date as "startDate",
            e.end_date as "endDate",
            e.location,
            e.venue_details as "venueDetails",
            e.event_link as "eventLink",
            e.max_attendees as "maxAttendees",
            e.cover_image as "coverImage",
            e.is_public as "isPublic",
            e.status,
            e.created_at as "createdAt",
            e.updated_at as "updatedAt",
            e.organizer_id as "organizerId",
            u.username as "organizerUsername",
            u.email as "organizerEmail",
            up.first_name as "organizerFirstName",
            up.last_name as "organizerLastName",
            up.profile_picture as "organizerProfilePicture",
            e.attending_count as "attendeeCount",
            e.interested_count as "interestedCount"
        FROM events e
        LEFT JOIN users u ON e.organizer_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE e.id = $1`;

    const values = [eventId];

    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error finding event by ID:', err);
        throw CustomError.internalServerError('Failed to find event');
    }
};

const updateEvent = async (client, eventId, eventData) => {
    const {
        title,
        description,
        startDate,
        endDate,
        location,
        venueDetails,
        eventLink,
        maxAttendees,
        coverImage,
        isPublic,
        status,
    } = eventData;

    const query = `
        UPDATE events SET 
            title = $1,
            description = $2,
            start_date = $3,
            end_date = $4,
            location = $5,
            venue_details = $6,
            event_link = $7,
            max_attendees = $8,
            cover_image = $9,
            is_public = $10,
            status = $11
        WHERE id = $12 RETURNING *`;

    const values = [
        title,
        description,
        startDate,
        endDate,
        location,
        venueDetails,
        eventLink,
        maxAttendees,
        coverImage,
        isPublic,
        status,
        eventId
    ];

    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error updating event:', err);
        throw CustomError.internalServerError('Failed to update event');
    }
};

const deleteEvent = async (client, eventId) => {
    const query = `DELETE FROM events WHERE id = $1 RETURNING *`;
    const values = [eventId];

    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error deleting event:', err);
        throw CustomError.internalServerError('Failed to delete event');
    }
};

const getEventAttendees = async (client, page, limit, eventId) => {
    const offset = (page - 1) * limit;

    const attendeeQuery = `
        SELECT 
            ea.event_id as "eventId",
            ea.status,
            ea.joined_at as "joinedAt",
            u.id as "userId",
            u.username,
            u.email,
            up.first_name as "firstName",
            up.last_name as "lastName",
            up.profile_picture as "profilePicture",
            up.bio,
            univ.name as "universityName",
            univ.logo_url as "universityLogoUrl"
        FROM event_attendees ea
        LEFT JOIN users u ON ea.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN universities univ ON u.university_id = univ.id
        WHERE ea.event_id = $1
        ORDER BY ea.joined_at DESC
        LIMIT $2 OFFSET $3`;

    const attendeeQueryValues = [eventId, limit, offset];
    const countQuery = `SELECT COUNT(*) FROM event_attendees WHERE event_id = $1`;

    try {
        const result = await client.query(attendeeQuery, attendeeQueryValues);
        const countResult = await client.query(countQuery, [eventId]);

        const totalAttendees = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalAttendees / limit);

        return {
            attendees: result.rows,
            meta: {
                totalItems: totalAttendees,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            }
        };
    } catch (err) {
        console.error('Error fetching event attendees:', err);
        throw CustomError.internalServerError('Failed to fetch event attendees');
    }
};

const markAttendanceStatus = async (client, eventId, userId, status) => {
    const query = `
        INSERT INTO event_attendees (event_id, user_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (event_id, user_id) 
        DO UPDATE SET status = $3, joined_at = CURRENT_TIMESTAMP
        RETURNING *`;

    const values = [eventId, userId, status];

    try {
        const result = await client.query(query, values);

        if (status === 'interested') {
            const interestedQuery = `UPDATE events SET interested_count = interested_count + 1 WHERE id = $1`;
            const interestedValues = [eventId];
            await client.query(interestedQuery, interestedValues);
        } else if (status === 'attending') {
            const attendingQuery = `UPDATE events SET attending_count = attending_count + 1 WHERE id = $1`;
            const attendingValues = [eventId];
            await client.query(attendingQuery, attendingValues);
        }

        return result.rows[0];
    } catch (err) {
        console.error('Error marking user attending:', err);
        throw CustomError.internalServerError('Failed to mark user attendance');
    }
};

const removeAttendanceStatus = async (client, eventId, userId) => {
    const query = `DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2 RETURNING *`;
    const values = [eventId, userId];

    try {
        const result = await client.query(query, values);

        if (result.rows[0].status === 'attending') {
            const attendingQuery = `UPDATE events SET attending_count = attending_count - 1 WHERE id = $1`;
            const attendingValues = [eventId];
            await client.query(attendingQuery, attendingValues);
        } else if (result.rows[0].status === 'interested') {
            const interestedQuery = `UPDATE events SET interested_count = interested_count - 1 WHERE id = $1`;
            const interestedValues = [eventId];
            await client.query(interestedQuery, interestedValues);
        }

        return result.rows[0] || null;
    } catch (err) {
        console.error('Error removing user attendance:', err);
        throw CustomError.internalServerError('Failed to remove user attendance');
    }
};

const findEventAttendee = async (client, eventId, userId) => {
    const query = `
        SELECT 
            ea.event_id as "eventId",
            ea.user_id as "userId",
            ea.status,
            ea.joined_at as "joinedAt",
            u.username,
            u.email,
            up.first_name as "firstName",
            up.last_name as "lastName",
            up.profile_picture as "profilePicture",
            up.bio,
            univ.name as "universityName",
            univ.logo_url as "universityLogoUrl"
        FROM event_attendees ea
        LEFT JOIN users u ON ea.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN universities univ ON u.university_id = univ.id
        WHERE ea.event_id = $1 AND ea.user_id = $2`;

    const values = [eventId, userId];

    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error finding event attendee:', err);
        throw CustomError.internalServerError('Failed to find event attendee');
    }
};

const updateEventAttendeeStatus = async (client, eventId, userId, status) => {
    try {
        await removeAttendanceStatus(client, eventId, userId);
        return await markAttendanceStatus(client, eventId, userId, status);
    } catch (error) {
        console.error('Error updating event attendee status:', error);
        throw CustomError.internalServerError('Failed to update attendee status');
    }

}



module.exports = {
    createEvent,
    getAllEvents,
    findEventById,
    updateEvent,
    deleteEvent,
    getEventAttendees,
    markAttendanceStatus,
    removeAttendanceStatus,
    updateEventAttendeeStatus,
    findEventAttendee,
}