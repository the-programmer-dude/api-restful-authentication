const ErrorExpress = require("./ErrorModule")

module.exports = callback => 
    async (req, res, next) => {
        try{
            await callback(req, res, next)
        }catch(err){
            return next(new ErrorExpress(err.code || err.name, err.message, err.status || 500))
        }
    }