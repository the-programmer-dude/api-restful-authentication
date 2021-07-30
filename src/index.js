const express = require("express")
const app = express()

const Router = require("./Router")
const ErrorHandler = require("./middlewares/ErrorHandler")

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(Router)
app.use(ErrorHandler)

app.listen(process.env.PORT || 8080)