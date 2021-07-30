const validationErrors = {
    username: "Username must be between 7-23 characters long",
    email: "Your email is less than 10 characters or bigger than 60 characters long, or you put an incorrect format.",
    password: "Password must be between 7-100 characters long",
}

const Errors = {
    ER_DUP_ENTRY: (res) => 
        res.status(400).json({ message: "User with this username already exists." }),

    JsonWebTokenError: (res) => 
        res.status(401).json({ message: "Invalid signature for token." }),

    TokenExpiredError: (res) => 
        res.status(403).json({ message: "Token expired." }),

    HttpExpressError: (res, error) => 
        res.status(error.status || 500).json(error.message ? { message: error.message } : {}),

    HttpExpressValidationError: (res, error) => {
        const errorMsg = validationErrors[error.message]

        return res.status(error.status).json({ message: errorMsg })
    }
}

module.exports = (error, req, res, next) => {
    try{
        if(Errors[error.name]) return Errors[error.name](res, error)
    }catch(err){
        console.error(error)
    
        return res.status(error.status || 500).json({ message: "Internal server error." })
    }

    console.error(error)

    return res.status(error.status || 500).json({ message: "Unknown error." })
}