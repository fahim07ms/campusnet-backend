const pool = require('../config/db');
const customError = require("../utils/errors");
const { validate: isValidUUID } = require('uuid');

const EventsModel = require("../models/eventsModel");
const CommunityModel = require('../models/communitiesModel');
const GroupsModel = require('../models/groupsModel');


/**
 * Controller for creating a new event
 */
const createNewEvent = async (req, res) => {
    const userId = req.userId;
    const { title, description, startDate, endDate, location, venueDetails, eventLink, maxAttendees, coverImage, isPublic, status } = req.body;
    let { communityId, groupId } = req.params;

    // Validate required fields
    if (!title || !description || !startDate || !endDate || !location) {
        return res.status(400).json(customError.badRequest({
            message: "Title, description, startDate, endDate, and location are required!",
        }));
    }

    // Validate UUIDs if provided
    if (communityId && !isValidUUID(communityId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid communityId!",
        }));
    }

    if (groupId && !isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }));
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Validate community exists if provided
        if (communityId) {
            const community = await CommunityModel.getCommunityById(client, communityId);
            if (!community) {
                return res.status(404).json(customError.notFound({
                    message: "No such community found.",
                }));
            }

            // Check if user is a member of the community
            const communityMember = await CommunityModel.getMemberDetailsById(client, communityId, userId);
            if (!communityMember) {
                return res.status(403).json(customError.forbidden({
                    message: "You are not a member of this community.",
                }));
            }
        }

        // Validate group exists if provided
        if (groupId) {
            const group = await GroupsModel.findGroupById(client, groupId);
            if (!group) {
                return res.status(404).json(customError.notFound({
                    message: "No such group found.",
                }));
            }

            communityId = group.communityId;

            // Check if user is a member of the group
            const groupMember = await GroupsModel.findGroupMemberById(client, groupId, userId);
            if (!groupMember) {
                return res.status(403).json(customError.forbidden({
                    message: "You are not a member of this group.",
                }));
            }
        }

        const eventData = {
            title,
            description,
            communityId: communityId || null,
            groupId: groupId || null,
            startDate,
            endDate,
            location,
            venueDetails,
            eventLink,
            maxAttendees,
            coverImage,
            isPublic: isPublic !== undefined ? isPublic : true,
            status: status || 'upcoming',
            organizerId: userId,
        };

        // Create event
        const result = await EventsModel.createEvent(client, eventData);

        await client.query("COMMIT");
        return res.status(201).json({
            message: "Event created successfully.",
            data: {
                event: result,
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in createNewEvent controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        if (client) client.release();
    }
};


/**
 * Controller for getting all events
 */
const getAllEvents = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    let { communityId, groupId } = req.params;

    // Check if page and limit are positive numbers
    if (page < 1 || limit < 1) {
        return res.status(400).json(customError.badRequest({
            message: "Page and limit must be positive integers.",
        }));
    }

    // Validate UUIDs if provided
    if (communityId && !isValidUUID(communityId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid communityId!",
        }));
    }

    if (groupId && !isValidUUID(groupId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid groupId!",
        }));
    }

    let client;
    try {
        client = await pool.connect();

        // Validate community exists if filtering by community
        if (communityId) {
            const community = await CommunityModel.getCommunityById(client, communityId);
            if (!community) {
                return res.status(404).json(customError.notFound({
                    message: "No such community found.",
                }));
            }
        }

        // Validate group exists if filtering by group
        if (groupId) {
            const group = await GroupsModel.findGroupById(client, groupId);
            if (!group) {
                return res.status(404).json(customError.notFound({
                    message: "No such group found.",
                }));
            }
        }

        // Get events
        const result = await EventsModel.getAllEvents(client, page, limit, communityId, groupId);

        return res.status(200).json({
            message: "Successfully retrieved events.",
            data: {
                events: result.events,
            },
            meta: result.meta,
        });
    } catch (error) {
        console.error("Error in getAllEvents controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        if (client) client.release();
    }
};


/**
 * Controller for getting a single event
 */
const getSingleEvent = async (req, res) => {
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid eventId!",
        }));
    }

    let client;
    try {
        client = await pool.connect();

        const result = await EventsModel.findEventById(client, eventId);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "No such event found.",
            }));
        }

        return res.status(200).json({
            message: "Successfully retrieved event.",
            data: {
                event: result,
            }
        });
    } catch (error) {
        console.error("Error in getSingleEvent controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
        }));
    } finally {
        if (client) client.release();
    }
};

/**
 * Controller for updating an event
 */
const updateEvent = async (req, res) => {
    const { eventId } = req.params;
    const { title, description, startDate, endDate, location, venueDetails, eventLink, maxAttendees, coverImage, isPublic, status } = req.body;
    const userId = req.userId;

    if (!isValidUUID(eventId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid eventId!",
        }));
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Find event and check if user is the organizer
        const event = await EventsModel.findEventById(client, eventId);
        if (!event) {
            return res.status(404).json(customError.notFound({
                message: "No such event found.",
            }));
        }

        // Check if user is the organizer (you might need to add organizer_id to the select query)
        // For now, assuming we have access to organizer info
        if (event.organizerId !== userId) {
            return res.status(403).json(customError.forbidden({
                message: "You are not authorized to update this event.",
            }));
        }

        const eventData = {
            title: title || event.title,
            description: description || event.description,
            startDate: startDate || event.startDate,
            endDate: endDate || event.endDate,
            location: location || event.location,
            venueDetails: venueDetails || event.venueDetails,
            eventLink: eventLink || event.eventLink,
            maxAttendees: maxAttendees || event.maxAttendees,
            coverImage: coverImage || event.coverImage,
            isPublic: isPublic !== undefined ? isPublic : event.isPublic,
            status: status || event.status,
        };

        const result = await EventsModel.updateEvent(client, eventId, eventData);

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Event updated successfully.",
            data: {
                event: result,
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in updateEvent controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
        }));
    } finally {
        if (client) client.release();
    }
};

/**
 * Controller for deleting an event
 */
const deleteEvent = async (req, res) => {
    const { eventId } = req.params;
    const userId = req.userId;

    if (!isValidUUID(eventId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid eventId!",
        }));
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Find event and check if user is the organizer
        const event = await EventsModel.findEventById(client, eventId);
        if (!event) {
            return res.status(404).json(customError.notFound({
                message: "No such event found.",
            }));
        }

        // Check if user is the organizer
        if (event.organizerId !== userId) {
            return res.status(403).json(customError.forbidden({
                message: "You are not authorized to delete this event.",
            }));
        }

        const result = await EventsModel.deleteEvent(client, eventId);

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Event deleted successfully.",
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in deleteEvent controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        if (client) client.release();
    }
};

/**
 * Controller for getting all attendees of an event
 */
const getAllAttendees = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { eventId } = req.params;

    if (!isValidUUID(eventId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid eventId!",
        }));
    }

    let client;
    try {
        client = await pool.connect();

        // Check if event exists
        const event = await EventsModel.findEventById(client, eventId);
        if (!event) {
            return res.status(404).json(customError.notFound({
                message: "No such event found.",
            }));
        }

        // Get attendees
        const result = await EventsModel.getEventAttendees(client, page, limit, eventId);

        return res.status(200).json({
            message: "Successfully retrieved attendees.",
            data: {
                attendees: result.attendees,
            },
            meta: result.meta,
        });
    } catch (error) {
        console.error("Error in getAllAttendees controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        if (client) client.release();
    }
};

/**
 * Controller for marking user as attending an event
 */
const markAttendanceStatus = async (req, res) => {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    if (!isValidUUID(eventId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid eventId!",
        }));
    }

    if (!status || !['attending', 'interested'].includes(status)) {
        return res.status(400).json(customError.badRequest({
            message: "Status must be either 'attending' or 'interested'.",
        }));
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if event exists
        const event = await EventsModel.findEventById(client, eventId);
        if (!event) {
            return res.status(404).json(customError.notFound({
                message: "No such event found.",
            }));
        }

        // // Check if event has reached max attendees (only for 'attending' status)
        // if (status === 'attending' && event.maxAttendees && event.attendeeCount >= event.maxAttendees) {
        //     return res.status(400).json(customError.badRequest({
        //         message: "Event has reached maximum attendees limit.",
        //     }));
        // }

        const result = await EventsModel.markAttendanceStatus(client, eventId, userId, status);

        await client.query("COMMIT");
        return res.status(200).json({
            message: `Successfully marked ${status}.`,
            data: {
                attendee: result,
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in markAttendanceStatus controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        if (client) client.release();
    }
};

/**
 * Controller for removing user attendance from an event
 */
const removeAttendanceStatus = async (req, res) => {
    const { eventId } = req.params;
    const userId = req.userId;

    if (!isValidUUID(eventId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid eventId!",
        }));
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if event exists
        const event = await EventsModel.findEventById(client, eventId);
        if (!event) {
            return res.status(404).json(customError.notFound({
                message: "No such event found.",
            }));
        }

        const result = await EventsModel.removeAttendanceStatus(client, eventId, userId);
        if (!result) {
            return res.status(404).json(customError.notFound({
                message: "You are not attending/interested in this event.",
            }));
        }

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Successfully removed attendance/interest.",
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in removeAttendanceStatus controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        if (client) client.release();
    }
};

/**
 * Controller for updating event attendee status
 */
const updateAttendeeStatus = async (req, res) => {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    // Validate UUIDs
    if (!isValidUUID(eventId) || !isValidUUID(userId)) {
        return res.status(400).json(customError.badRequest({
            message: "Invalid eventId or userId!",
        }));
    }

    // Validate status
    if (!status || !['attending', 'interested'].includes(status)) {
        return res.status(400).json(customError.badRequest({
            message: "Status must be either 'attending' or 'interested'.",
        }));
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Check if event exists
        const event = await EventsModel.findEventById(client, eventId);
        if (!event) {
            return res.status(404).json(customError.notFound({
                message: "No such event found.",
            }));
        }

        // Check if user is in the event attendees table
        const attendee = await EventsModel.findEventAttendee(client, eventId, userId);
        if (!attendee) {
            return res.status(404).json(customError.notFound({
                message: "User is not registered for this event.",
            }));
        }

        // // Check if event has reached max attendees when changing to 'attending'
        // if (status === 'attending' && attendee.status !== 'attending' &&
        //     event.maxAttendees && event.attendeeCount >= event.maxAttendees) {
        //     return res.status(400).json(customError.badRequest({
        //         message: "Event has reached maximum attendees limit.",
        //     }));
        // }

        const result = await EventsModel.updateEventAttendeeStatus(client, eventId, userId, status);

        await client.query("COMMIT");
        return res.status(200).json({
            message: "Successfully updated attendee status.",
            data: {
                attendee: result,
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in updateAttendeeStatus controller:", error);
        return res.status(500).json(customError.internalServerError({
            message: "Internal server error",
            details: {
                error: error.message,
            }
        }));
    } finally {
        if (client) client.release();
    }
};



module.exports = {
    createNewEvent,
    getAllEvents,
    getSingleEvent,
    updateEvent,
    deleteEvent,

    getAllAttendees,
    markAttendanceStatus,
    removeAttendanceStatus,
    updateAttendeeStatus,
}