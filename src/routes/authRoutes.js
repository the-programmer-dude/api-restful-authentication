const express = require("express")
const Router = express.Router()

const authController = require("../controllers/authController")
const tryCatch = require("../utils/tryCatch")
const authMid = require("../middlewares/auth")

const { body } = require('express-validator');

//authentication
Router.post(
    "/register", 
    body('username').isLength({ min: 7, max: 23 }),
    body('email').isLength({ min: 10, max: 60 }).isEmail(),
    body('password').isLength({ min: 7, max: 100 }),
    tryCatch(authController.register)
);

Router.post(
    "/login", 
    body('username').isLength({ min: 7, max: 23 }),
    tryCatch(authController.login)
)
Router.post(
    "/two-fa/:token", 
    tryCatch(authController.TwoFAAuthentication)
)
Router.post("/token", tryCatch(authController.token))
Router.delete("/logout", authMid, tryCatch(authController.logout))

//get info
Router.get("/getCurrentUser", authMid, tryCatch(authController.getCurrentUser))
Router.get("/forgotUsernames", tryCatch(authController.forgotUsernames))

//pass reset req
Router.get("/reset-password", tryCatch(authController.requestResetPass))
Router.put("/update-password/:token", tryCatch(authController.updatePassword))
// Router.use("/auth", authController)

module.exports = Router