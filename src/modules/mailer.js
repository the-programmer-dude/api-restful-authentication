require("dotenv").config()

const nodemailer = require("nodemailer")
const ejs = require("ejs")
const path = require("path")

const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
})

module.exports = {
    sendMail: async (fileName, data, {from, to, subject}) => {
        const pathForEjs = path.resolve("./src/mail/template/" + fileName)

        const file = await ejs.renderFile(pathForEjs, data)

        await transport.sendMail({
            from,
            to,
            subject,
            html: file
        })
    }
}