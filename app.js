const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");

const app = express();

require("dotenv").config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

db.connect((err) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("MySQL connected");
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Multer config for image uploads
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
app.get("/", (req, res) => {
    db.query("SELECT * FROM foods", (err, foods) => {
        if (err) return res.send(err);
        res.render("index", { foods });
    });
});

// Single food page
app.get("/food/:id", (req, res) => {
    db.query(
        "SELECT * FROM foods WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) return res.send(err);
            const food = result[0];
            if (food) {
                food.price = parseFloat(food.price);
            }
            // Pass query object into EJS
            res.render("food", { food, query: req.query });
        }
    );
});

// Place order
app.post("/order", (req, res) => {
    const { food_id, quantity, customer_name, email, address } = req.body;
    const order_date = new Date();

    db.query(
        "INSERT INTO customers (name, email, address) VALUES (?, ?, ?)",
        [customer_name, email, address],
        (err, result) => {
            if (err) return res.send(err);
            const customerId = result.insertId;

            db.query(
                "INSERT INTO orders (customer_id, food_id, quantity, order_date, status) VALUES (?, ?, ?, ?, ?)",
                [customerId, food_id, quantity, order_date, "Pending"],
                (err) => {
                    if (err) return res.send(err);
                    res.redirect(`/food/${food_id}?success=1`);
                }
            );
        }
    );
});

// Admin dashboard
// GET admin page - fetch both orders and foods
app.get("/admin", (req, res) => {
    const ordersQuery = `
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

    const foodsQuery = `SELECT * FROM foods`;

    db.query(ordersQuery, (err, orders) => {
        if (err) return res.send(err);

        db.query(foodsQuery, (err2, foods) => {
            if (err2) return res.send(err2);

            res.render("admin", { orders, foods });
        });
    });
});

// POST route to mark order complete
app.post("/admin/complete-order/:id", (req, res) => {
    const orderId = req.params.id;

    db.query(
        "UPDATE orders SET status = ? WHERE id = ?",
        ["Completed", orderId],
        (err) => {
            if (err) return res.send(err);
            res.redirect("/admin");
        }
    );
});

app.post("/admin/update-food/:id", upload.single("image"), (req, res) => {
    const foodId = req.params.id;
    const { name, description, price } = req.body;
    let updateQuery, values;

    if (req.file) {
        const image_url = req.file.filename;
        updateQuery =
            "UPDATE foods SET name = ?, description = ?, price = ?, image_url = ? WHERE id = ?";
        values = [name, description, price, image_url, foodId];
    } else {
        updateQuery =
            "UPDATE foods SET name = ?, description = ?, price = ? WHERE id = ?";
        values = [name, description, price, foodId];
    }

    db.query(updateQuery, values, (err) => {
        if (err) return res.send(err);
        res.redirect("/admin");
    });
});

// Admin - Add food
app.post("/admin/add-food", upload.single("image"), (req, res) => {
    const { name, description, price } = req.body;
    const image_url = req.file ? req.file.filename : "default.jpg";

    db.query(
        "INSERT INTO foods (name, description, price, image_url) VALUES (?, ?, ?, ?)",
        [name, description, price, image_url],
        (err) => {
            if (err) return res.send(err);
            res.redirect("/admin");
        }
    );
});

// Admin - Edit food
app.get("/admin/edit-food/:id", (req, res) => {
    const foodId = req.params.id;
    db.query("SELECT * FROM foods WHERE id = ?", [foodId], (err, result) => {
        if (err || result.length === 0) return res.send("Food not found");
        res.render("edit_food", { food: result[0] });
    });
});

// Admin - Delete food
app.get("/admin/delete-food/:id", (req, res) => {
    db.query("DELETE FROM foods WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.send(err);
        res.redirect("/admin");
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
