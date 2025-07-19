const express = require("express");
const postgres = require("postgres");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
require("dotenv").config();

const app = express();

// PostgreSQL client setup
const sql = postgres({
    url: process.env.DB_URL, // you can also use individual keys below
    host: process.env.Host,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/images");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

// ROUTES

// Home page - list all foods
app.get("/", async (req, res) => {
    try {
        const foods = await sql`SELECT * FROM foods`;
        res.render("index", { foods });
    } catch (err) {
        res.send(err);
    }
});

// Single food page
app.get("/food/:id", async (req, res) => {
    try {
        const result =
            await sql`SELECT * FROM foods WHERE id = ${req.params.id}`;
        const food = result[0];
        if (food) {
            food.price = parseFloat(food.price);
        }
        res.render("food", { food, query: req.query });
    } catch (err) {
        res.send(err);
    }
});

// Place order
app.post("/order", async (req, res) => {
    const { food_id, quantity, customer_name, email, address } = req.body;
    const order_date = new Date();

    try {
        const customerResult = await sql`
            INSERT INTO customers (name, email, address)
            VALUES (${customer_name}, ${email}, ${address})
            RETURNING id
        `;
        const customerId = customerResult[0].id;

        await sql`
            INSERT INTO orders (customer_id, food_id, quantity, order_date, status)
            VALUES (${customerId}, ${food_id}, ${quantity}, ${order_date}, 'Pending')
        `;

        res.redirect(`/food/${food_id}?success=1`);
    } catch (err) {
        res.send(err);
    }
});

// Admin dashboard
app.get("/admin", async (req, res) => {
    try {
        const orders = await sql`
            SELECT
                orders.id AS order_id,
                foods.name AS food_name,
                customers.name AS customer_name,
                orders.quantity,
                orders.order_date,
                orders.status
            FROM orders
            JOIN foods ON orders.food_id = foods.id
            JOIN customers ON orders.customer_id = customers.id
        `;

        const foods = await sql`SELECT * FROM foods`;

        res.render("admin", { orders, foods });
    } catch (err) {
        res.send(err);
    }
});

// Mark order complete
app.post("/admin/complete-order/:id", async (req, res) => {
    try {
        await sql`
            UPDATE orders SET status = 'Completed' WHERE id = ${req.params.id}
        `;
        res.redirect("/admin");
    } catch (err) {
        res.send(err);
    }
});

// Add food
app.post("/admin/add-food", upload.single("image"), async (req, res) => {
    const { name, description, price } = req.body;
    const image_url = req.file ? req.file.filename : "default.jpg";

    try {
        await sql`
            INSERT INTO foods (name, description, price, image_url)
            VALUES (${name}, ${description}, ${price}, ${image_url})
        `;
        res.redirect("/admin");
    } catch (err) {
        res.send(err);
    }
});

// Delete food
app.get("/admin/delete-food/:id", async (req, res) => {
    try {
        await sql`DELETE FROM foods WHERE id = ${req.params.id}`;
        res.redirect("/admin");
    } catch (err) {
        res.send(err);
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
