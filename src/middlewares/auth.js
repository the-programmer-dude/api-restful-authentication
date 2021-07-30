require("dotenv").config()

const jwt = require("jsonwebtoken")

const knex = require("../db")
const tryCatch = require("../utils/tryCatch")

const ErrorExpress = require("../utils/ErrorModule")

module.exports = tryCatch(async (req, res, next) => {
    const { authorization } = req.headers

    if(!authorization)
        return next(new ErrorExpress("HttpExpressError", "No token provided.", 401))

    const [ bearer, token ] = authorization.split(" ")

    if(!bearer || !token)
        return next(new ErrorExpress("HttpExpressError", "Token badly formatted.", 401))
        
    if(bearer.toLowerCase() !== "bearer")
        return next(new ErrorExpress("HttpExpressError", "No bearer provided.", 401))


    const user = jwt.verify(token, process.env.ACCESS_SECRET)

    const [userAssociated] = await knex("users").select("*").where("id", user.id)

    if(!userAssociated)
        return next(new ErrorExpress("HttpExpressError", "No user with this token.", 403))


    req.user = {
        isAdmin: userAssociated.isAdmin,
        ...user
    }

    return next()
})