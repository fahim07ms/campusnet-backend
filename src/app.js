const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();

const swaggerUi = require("swagger-ui-express");
const fs = require('fs');
const YAML = require("yaml");
const path = require("path");

const file = fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8');
const openapiDocumentation = YAML.parse(file);

// Import routes from routes folder

const app = express();

// Use middlewares
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// API endpoints will be added here
// Swagger API docs route
app.use("/api/docs/v1", swaggerUi.serve, swaggerUi.setup(openapiDocumentation));

module.exports = app;
