const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
dotenv.config();

// Swagger Documentation UI Setup
const swaggerUi = require("swagger-ui-express");
const SwaggerParser = require("@apidevtools/swagger-parser");
const path = require("path");


const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Too many requests, please try again after an hour" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Import routes from routes folder
const { authRoutes } = require("./routes/authRoutes");

// Initialize express
const app = express();

// Use middlewares
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);

// Rate Limiting Configurations
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        error: "Too many login attempts, please try again after an hour",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again after an hour" },
});



// API endpoints will be added here
app.get("/", (req, res) => {
    return res.status(200).json({ message: "Server is running!" });
});

app.use("/api/v1/auth", authLimiter, authRoutes);

SwaggerParser
    .bundle(path.join(__dirname, "docs", "openapi.yaml"))
    .then((api) => {
        app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(api));
    })
    .catch((err) => {
        console.error("❌ Failed to load OpenAPI docs:", err);
    });


module.exports = app;
