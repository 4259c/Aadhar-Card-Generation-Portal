const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3001; // Use port from environment variables or default to 3001

app.use(cors());
app.use(bodyParser.json());

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the existing uploads folder
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });
app.use("/uploads", express.static("uploads"));

// Create a MySQL connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to the database");
  }
});

// API endpoint to save user details from AdharFront
app.post("/saveUserDetails", upload.single("image"), (req, res) => {
  const { name, dob, gender, adharNumber } = req.body;
  const imagePath = req.file ? req.file.path : null; // Check if the file was uploaded

  const sql =
    "INSERT INTO aadhar_front (name, dob, gender, adhar_number, image_path) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, dob, gender, adharNumber, imagePath], (err, result) => {
    if (err) {
      console.error("Error saving user details:", err);
      res.status(500).json({ error: "Error saving user details" });
    } else {
      console.log("User details saved successfully");
      res.status(200).json({ message: "User details saved successfully" });
    }
  });
});

// API endpoint to save user details from AdharBack
app.post("/saveBackDetails", (req, res) => {
  const { address, pincode, reenterAdhar } = req.body;

  const sql =
    "INSERT INTO aadhar_back (address, pincode, reenter_adhar) VALUES (?, ?, ?)";
  db.query(sql, [address, pincode, reenterAdhar], (err, result) => {
    if (err) {
      console.error("Error saving back details:", err);
      res.status(500).json({ error: "Error saving back details" });
    } else {
      console.log("Back details saved successfully");
      res.status(200).json({ message: "Back details saved successfully" });
    }
  });
});

// API endpoint to fetch Aadhar details based on Aadhar number
app.get("/getAadharDetails/:adharNumber", (req, res) => {
  const adharNumber = req.params.adharNumber;

  const frontSql = "SELECT * FROM aadhar_front WHERE adhar_number = ?";
  const backSql = "SELECT * FROM aadhar_back WHERE reenter_adhar = ?";

  db.query(frontSql, [adharNumber], (err, frontResult) => {
    if (err) {
      console.error("Error fetching Aadhar front details:", err);
      res.status(500).json({ error: "Error fetching Aadhar details" });
    } else {
      db.query(backSql, [adharNumber], (err, backResult) => {
        if (err) {
          console.error("Error fetching Aadhar back details:", err);
          res.status(500).json({ error: "Error fetching Aadhar details" });
        } else {
          if (frontResult.length > 0 && backResult.length > 0) {
            const userDetails = {
              frontDetails: frontResult[0],
              backDetails: backResult[0],
            };
            res.status(200).json(userDetails);
          } else {
            res.status(404).json({ error: "Aadhar details not found" });
          }
        }
      });
    }
  });
});

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
