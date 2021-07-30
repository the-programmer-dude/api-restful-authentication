const express = require("express")
const Router = express.Router()

const tryCatch = require("../utils/tryCatch")
const authMid = require("../middlewares/auth")

const userController = require("../controllers/userController")

Router.get("/", tryCatch(userController.readAll))
Router.get("/:id", tryCatch(userController.read))
Router.delete("/:id", authMid, tryCatch(userController.delete))
Router.put("/:id", authMid, tryCatch(userController.update))

module.exports = Router