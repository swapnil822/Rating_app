

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const storeRoutes = require("./routes/stores");
const ratingRoutes = require("./routes/ratings");

const User = require("./models/User");
const Store = require("./models/Store");
const Rating = require("./models/Rating");

const app = express();
const PORT = process.env.PORT || 8000;


app.set("trust proxy", 1);


app.use(express.json());

const allowedOrigins = process.env.CLIENT_URL?.split(',').map(url => url.trim()) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  })
);


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error(" MongoDB error:", err);
    process.exit(1);
  });

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/ratings", ratingRoutes);

app.get("/api/dashboard", async (req, res, next) => {
  try {
    const [
      users,
      stores,
      ratings,
      recentRatings,
      adminCount,
      ownerCount,
      userCount
    ] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      Rating.countDocuments(),
      Rating.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user store"),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "owner" }),
      User.countDocuments({ role: "user" })
    ]);

    res.json({
      users,
      stores,
      ratings,
      recentRatings,
      adminCount,
      ownerCount,
      userCount
    });
  } catch (err) {
    next(err);
  }
});

app.get("/", (req, res) => {
  res.send(" Rating App API is running");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message
  });
});



app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
