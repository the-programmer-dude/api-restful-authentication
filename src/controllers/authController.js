require("dotenv").config()

const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const knex = require("../db")
const mailerConfig = require("../modules/mailer")
const ErrorExpress = require("../utils/ErrorModule")

const { validationResult } = require("express-validator")
const { randomBytes } = require("crypto")

const generatePassSalt = async data => {
    const salt = await bcrypt.genSalt(10)

    return await bcrypt.hash(data, salt)
}

const signToken = data => 
    jwt.sign(data, process.env.ACCESS_SECRET, { expiresIn: "1h" })

const compareHashes = async (data, hash) => 
    bcrypt.compare(data, hash)

module.exports = {
    register: async (req, res, next) => {
        let { email, username, password } = req.body

        const {errors} = validationResult(req)

        if(errors.length)
            return next(new ErrorExpress("HttpExpressValidationError", errors[0].param, 400))

        email = email.toString()
        username = username.toString()
        password = password.toString()

        const passSalt = await generatePassSalt(password)

        await knex("users").insert({ email, username, password: passSalt })

        const [{ id }] = await knex("users").select("*").where("username", username)

        const refreshToken = jwt.sign({id}, process.env.REFRESH_SECRET)
        const accessToken = signToken({id})

        try{
            await knex("refreshTokens").insert({ token: refreshToken, user_id: id })
        }catch(err){
            await knex("users").where("id", id).del()

            console.error(err)
            return next(new ErrorExpress("HttpExpressError", "Couldn't register user, try again or later."))
        }

        return res.json({ refreshToken, accessToken })
    },
    login: async (req, res, next) => {
        const { username, password } = req.body

        const {errors} = validationResult(req)

        if(errors.length)
            return next(new ErrorExpress("HttpExpressValidationError", errors[0].param, 400))

        const [user] = await knex("users").select("*").where("username", username)

        if(!user)
            return next(new ErrorExpress("HttpExpressError", "Incorrect username or pass.", 400))

        const passMatch = await compareHashes(password, user.password)

        if(!passMatch)
            return next(new ErrorExpress("HttpExpressError", "Incorrect username or pass.", 400))

        if(!user.TwoFA){
            const { id } = user
            const refreshToken = jwt.sign({id}, process.env.REFRESH_SECRET)
            const accessToken = signToken({id}) 
    
            await knex("refreshTokens").insert({ token: refreshToken, user_id: id })
    
            return res.json({ refreshToken, accessToken, TwoFA: false })
        }

        const token = randomBytes(32).toString('hex')
        const expiresAt = Date.now() + (12 * 60 * 60 * 1000)
        const TwoFAConfirmation = Math.floor(Math.random() * 999999)

        await knex("users").update({ TwoFAToken: token, TwoFAExpiresAt: expiresAt, TwoFAConfirmation }).where("id", user.id)

        await mailerConfig.sendMail(
            'TwoFAConfirmer.ejs', 
            { code: TwoFAConfirmation }, {
                from: "apiRestFul@mail.com",
                to: user.email,
                subject: "Two Factor auth confirmation code."
            }
        );

        return res.status(200).json({ TwoFA: true });
    },
    TwoFAAuthentication: async (req, res, next) => {
        const { code } = req.body

        if(!code)
            return next(new ErrorExpress('HttpExpressError', 'No code provided.', 400))

        const [user] = await knex("users").select().where("TwoFAToken", req.params.token)

        if(!user)
            return next(new ErrorExpress('HttpExpressError', 'No user found with this token.', 400))

        const currentDate = Date.now()

        if(user.TwoFAExpiresAt - currentDate <= 0)
            return next(new ErrorExpress("HttpExpressError", "Token expired.", 400))

        if(user.TwoFAConfirmation !== Number(code))
            return next(new ErrorExpress('HttpExpressError', 'Codes don\'t match.', 400))

        const { id } = user
        const refreshToken = jwt.sign({id}, process.env.REFRESH_SECRET)
        const accessToken = signToken({id}) 
    
        await knex("refreshTokens").insert({ token: refreshToken, user_id: id })

        return res.json({ refreshToken, accessToken })
    },
    token: async (req, res, next) => {
        const { refreshToken } = req.body

        if(!refreshToken)
            return next(new ErrorExpress("HttpExpressError", "No refresh token provided.", 400))

        const [token] = await knex("refreshTokens").select("*").where("token", refreshToken)

        if(!token)
            return next(new ErrorExpress("HttpExpressError", "Incorrect token.", 400))

        const accessToken = signToken({id: token.user_id}) 

        return res.json({ accessToken })
    },
    getCurrentUser: (req, res, next) => {
        const user = req.user

        return res.json({ user: user.id })
    },
    logout: async (req, res, next) => {
        const { token } = req.body
        
        if(!token)
            return next(new ErrorExpress("HttpExpressError", "No token provided.", 400))

        const user = jwt.verify(token, process.env.REFRESH_SECRET)

        if(req.user.id !== user.id)
            return next(new ErrorExpress("HttpExpressError", "Token provided doesn't match current user logged in.", 401))

        const [tokenAssociated] = await knex("refreshTokens").select().where("token", token)

        if(!tokenAssociated)
            return next(new ErrorExpress("HttpExpressError", "No user with this token.", 401))

        await knex("refreshTokens").where("token", token).delete()

        return res.sendStatus(204)
    },
    forgotUsernames: async(req, res, next) => {
        const { email } = req.query

        if(!email)
            return next(new ErrorExpress("HttpExpressError", "No email provided.", 400))

        const associatedUsers = await knex("users").select("username").where({email})

        if(!associatedUsers.length)
            return next(new ErrorExpress("HttpExpressError", "No user with this email.", 400))
        
        const accs = associatedUsers.map(val => val.username)

        await mailerConfig.sendMail(
            'requestUsers.ejs', 
            { accs }, {
                from: "apiRestFul@mail.com",
                to: email,
                subject: "Forgot usernames."
            }
        );

        return res.sendStatus(200)
    },
    requestResetPass: async(req, res, next) => {
        const { email, username } = req.body

        if(!email || !username)
            return next(new ErrorExpress("HttpExpressError", "No email/username provided.", 400))

        const [user] = await knex("users").select().where({
            username,
            email
        })

        if(!user)
            return next(new ErrorExpress("HttpExpressError", "User doesn't exist with this email.", 400))

        const currentDate = new Date()

        const token = crypto.randomBytes(32).toString("hex")
        const expirationDate = new Date().setHours(currentDate.getHours() + 15)

        await knex('users').update({
            updatePassToken: token,
            updatePassTokenExpiresIn: expirationDate
        })

        try{
            await mailerConfig.sendMail(
                'sendMail.ejs', 
                { link: req.headers.host + "/auth/update-password/" + token }, {
                    from: "apiRestFul@mail.com",
                    to: email,
                    subject: "Password reset request."
                }
            );
        }catch(err){
            console.error(err)

            await knex('users').update({
                updatePassToken: null,
                updatePassTokenExpiresIn: null
            })

            return next(new ErrorExpress("HttpExpressError", "Couldn't send email.", 500))
        }

        return res.sendStatus(200)
    },
    updatePassword: async (req, res, next) => {
        const {
            password,
            passwordConfirm
        } = req.body

        const { token } = req.params

        if(!password || !passwordConfirm)
            return next(new ErrorExpress("HttpExpressError", "No passwords provided.", 400))

        const [userWithToken] = await knex("users").select("*").where("updatePassToken", token)

        if(!userWithToken) 
            return next(new ErrorExpress("HttpExpressError", "Token doesn't exist or someone already used it.", 400))

        const currentDate = Date.now()

        if(userWithToken.updatePassTokenExpiresIn - currentDate <= 0)
            return next(new ErrorExpress("HttpExpressError", "Token expired.", 400))

        if(password !== passwordConfirm)
            return next(new ErrorExpress("HttpExpressError", "Typed passwords doesn't match.", 400))

        const passwordsMatch = await compareHashes(password, userWithToken.password)

        if(passwordsMatch)
            return next(new ErrorExpress("HttpExpressError", "Cannot match the old password.", 400))

        const newPass = await generatePassSalt(password)

        await knex("users").update({ password: newPass }).where({ id: userWithToken.id })
        await knex("refreshTokens").where({ user_id: userWithToken.id }).delete()

        await mailerConfig.sendMail(
            'passReset.ejs', 
            { username: userWithToken.username }, {
                from: "apiRestFul@mail.com",
                to: userWithToken.email,
                subject: "Password reseted."
            }
        );

        return res.status(200).json({ message: "Success!" })
    }
}