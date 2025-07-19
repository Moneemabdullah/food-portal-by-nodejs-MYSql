const postgres = require("postgres");
require("dotenv").config();

const sql = postgres({
    url: process.env.DB_URL,
    host: process.env.Host,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

async function createTables() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS foods (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price NUMERIC(10, 2) NOT NULL,
                image_url TEXT
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                address TEXT
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
                quantity INTEGER NOT NULL,
                order_date TIMESTAMP NOT NULL,
                status TEXT DEFAULT 'Pending'
            );
        `;

        console.log("Tables created successfully.");
        process.exit();
    } catch (err) {
        console.error("Error creating tables:", err);
        process.exit(1);
    }
}

createTables();
