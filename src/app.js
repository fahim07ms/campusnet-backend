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
const { userRoutes } = require("./routes/userRoutes");
const { universityRoutes } = require("./routes/universityRoutes");
const { communitiesRoutes } = require("./routes/communitiesRoutes");

// Initialize express
const app = express();

// Use middlewares
app.use(
    cors({
        origin:
            process.env.NODE_ENV == "production"
                ? process.env.FRONTEND_URL
                : "http://localhost:3000",
        credentials: true,
    }),
);
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
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/universities", universityRoutes);
app.use("/api/v1/communities", communitiesRoutes);

SwaggerParser.bundle(path.join(__dirname, "docs", "openapi.yaml"))
    .then((api) => {
        app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(api));
    })
    .catch((err) => {
        console.error("Failed to load OpenAPI docs:", err);
    });

module.exports = app;
