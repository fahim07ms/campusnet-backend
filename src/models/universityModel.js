const CustomError = require("../utils/errors");

const getAllUniversities = async (client, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    const query = {
        text: "SELECT id, name, domains, country, established_year, description, logo_url, websites FROM universities ORDER BY name ASC LIMIT $1 OFFSET $2",
        values: [limit, offset],
    };

    const countQuery = {
        text: "SELECT COUNT(*) FROM universities",
    };

    try {
        const result = await client.query(query);
        const countResult = await client.query(countQuery);

        const totalUniversities = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalUniversities / limit);

        return {
            universities: result.rows,
            meta: {
                totalItems: totalUniversities,
                itemsPerPage: limit,
                itemCount: result.rows.length,
                currentPage: page,
                totalPages: totalPages,
            },
        };
    } catch (err) {
        console.error("Error fetching universities:", err);
        throw CustomError.internalServerError(
            "Failed to retrieve universities",
        );
    }
};

module.exports = {
    getAllUniversities,
};
