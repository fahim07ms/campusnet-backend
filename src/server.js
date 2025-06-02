const dotenv = require("dotenv");
dotenv.config();
console.log("Starting server...");
const app = require("./app");

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
