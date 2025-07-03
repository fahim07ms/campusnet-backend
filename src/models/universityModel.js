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

/*
module.exports = {
    getAllUniversities,
};
*/


const createUniversity = async (client, { name, location, description, logo_url, website_url }) => {
    const query = {
        text: `
            INSERT INTO universities (name, location, description, logo_url, website_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, location, description, logo_url, website_url
        `,
        values: [name, location, description, logo_url, website_url],
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error("Error creating university:", err);
        throw CustomError.internalServerError("Failed to create university");
    }
};

const updateUniversity = async (client, universityId, { name, location, description, logo_url, website_url }) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name) {
        fields.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (location) {
        fields.push(`location = $${paramIndex++}`);
        values.push(location);
    }
    if (description) {
        fields.push(`description = $${paramIndex++}`);
        values.push(description);
    }
    if (logo_url) {
        fields.push(`logo_url = $${paramIndex++}`);
        values.push(logo_url);
    }
    if (website_url) {
        fields.push(`website_url = $${paramIndex++}`);
        values.push(website_url);
    }

    if (fields.length === 0) {
        return null; // No fields to update
    }

    values.push(universityId); // Add universityId to the end of values

    const query = {
        text: `
            UPDATE universities
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex}
            RETURNING id, name, location, description, logo_url, website_url
        `,
        values: values,
    };

    try {
        const result = await client.query(query);
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating university ${universityId}:`, err);
        throw CustomError.internalServerError("Failed to update university");
    }
};

const deleteUniversity = async (client, universityId) => {
    const query = {
        text: `
            DELETE FROM universities
            WHERE id = $1
            RETURNING id
        `,
        values: [universityId],
    };

    try {
        const result = await client.query(query);
        return result.rowCount; // Returns 1 if deleted, 0 if not found
    } catch (err) {
        console.error(`Error deleting university ${universityId}:`, err);
        throw CustomError.internalServerError("Failed to delete university");
    }
};

module.exports = {
    getAllUniversities,
    createUniversity,
    updateUniversity,
    deleteUniversity,
};


