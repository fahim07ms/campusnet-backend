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
const fs = require('fs');
const YAML = require("yaml");
const path = require("path");

const file = fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8');
const openapiDocumentation = YAML.parse(file);

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Too many requests, please try again after an hour" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Import routes from routes folder
const authRoutes = require("./routes/authRoutes");

// Initialize express
const app = express();

// Use middlewares
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);

// API endpoints will be added here
app.use("/", () => {
    return "Server is running!";
});

app.use("/api/v1/auth", authRoutes);

// Swagger API docs route
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocumentation));

// 404 handler
app.use('*', (req, res) => {
    return res.status(404).json({
        code: 404,
        name: "not_found_error",
        message: "Route not found",
        timestamp: new Date().toISOString()
    })
});

module.exports = app;
