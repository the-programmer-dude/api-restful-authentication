const knex = require("../db")

const mailerConfig = require("../modules/mailer")
const ErrorExpress = require("../utils/ErrorModule")

const bcrypt = require("bcrypt")

const compareHashes = async (data, hash) => 
    bcrypt.compare(data, hash)

module.exports = {
    readAll: async (req, res, next) => {
        const { page: currentPage = 1 } = req.query

        const users = await knex("users").select(
            "id", "username", "created_at", "updated_at"
        ).paginate({ perPage: 10, currentPage })

        return res.status(200).json(users.data)
    },
    read: async (req, res, next) => {
        const { id } = req.params

        const [user] = await knex("users").select(
            "id", "username", "created_at", "updated_at"
        ).where("id", id)

        if(!user)
            return next(new ErrorExpress("HttpExpressError", "No user found.", 404))

        return res.status(200).json(user)
    },
    delete: async(req, res, next) => {
        const { id } = req.params
        const authenticatedUser = req.user

        const [user] = await knex("users").select().where("id", id)

        if(!user)
            return next(new ErrorExpress("HttpExpressError", "No user found.", 404))

        if(authenticatedUser.id === user.id){
            await knex("refreshTokens").delete().where("user_id", id)
            await knex("users").delete().where("id", id)
            
            return res.sendStatus(204)
        }
        
        if(!authenticatedUser.isAdmin || user.isAdmin)
            return next(new ErrorExpress("HttpExpressError", "Forbidden.", 403))
        
        await knex("refreshTokens").delete().where("user_id", id)
        await knex("users").delete().where("id", id)

        return res.sendStatus(204)
    },
    update: async (req, res, next) => {
        const { id } = req.params
        let { email, username, TwoFA, password } = req.body

        if (typeof TwoFA !== "boolean")
            TwoFA = TwoFA ? true : false

        if(!password)
            return next(new ErrorExpress("HttpExpressError", "No password provided.", 400))

        if(!email && !username && !TwoFA)
            return next(new ErrorExpress("HttpExpressError", "No fields provided for update.", 400))

        const [user] = await knex("users").select().where("id", id)

        const passwordsMatch = await compareHashes(password, user.password)
        
        if(!passwordsMatch)
            return next(new ErrorExpress("HttpExpressError", "Incorrect password.", 400))
            
        if(email && user.email === email)
            return next(new ErrorExpress("HttpExpressError", "New email cannot match the old one.", 400))
        
        if(username && user.username === username)
            return next(new ErrorExpress("HttpExpressError", "New username cannot match the old one.", 400))
        
        if(!user)
            return next(new ErrorExpress("HttpExpressError", "No user found.", 400))

        if(req.user.id === user.id){
            await knex("users").update({
                email: email ? email : user.email,
                username: username ? username : user.username
            }).where("id", id)
        }else{
            if(!req.user.isAdmin || user.isAdmin)
                return next(new ErrorExpress("HttpExpressError", "Not allowed.", 403))
            
            await knex("users").update({
                email: email ? email : user.email,
                username: username ? username : user.username,
                TwoFA: TwoFA ? username : user.TwoFA
            }).where("id", id)
        }

        const updates = {email, username, TwoFA, madeByAdmin: req.user.isAdmin && req.user.id !== user.id ? "an admin." : "you."}
        await mailerConfig.sendMail(
            'updatedAccount.ejs', 
            { updates }, {
                from: "apiRestFul@mail.com",
                to: user.email,
                subject: "Account updated."
            }
        );

        return res.sendStatus(204)
    }
}