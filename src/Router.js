const express = require("express")
const Router = express.Router()

const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")

Router.use("/auth", authRoutes)
Router.use("/users", userRoutes)

Router.use((req, res) => res.status(404).json({ message: "Route not found." }))

module.exports = Router