const express = require("express");
const router = express.Router();

const {
    createNewEvent,
    getAllEvents,
    getSingleEvent,
    updateEvent,
    deleteEvent,

    getAllAttendees,
    markAttendanceStatus,
    removeAttendanceStatus,
    updateAttendeeStatus
} = require("../controllers/eventsController.js");
const {authMiddleware} = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, createNewEvent);
router.get("/", getAllEvents);
router.get("/:eventId", authMiddleware, getSingleEvent);
router.put("/:eventId", authMiddleware, updateEvent);
router.delete("/:eventId", authMiddleware, deleteEvent);

router.get("/:eventId/attendees", authMiddleware, getAllAttendees);
router.post("/:eventId/attendees", authMiddleware, markAttendanceStatus);
router.delete("/:eventId/attendees/me", authMiddleware, removeAttendanceStatus);
router.put("/:eventId/attendees", authMiddleware, updateAttendeeStatus);


module.exports = {
    eventsRoutes: router,
}