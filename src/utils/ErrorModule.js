class ErrorExpress extends Error{
    constructor(name, message, status){
        super(message)

        this.name = name;
        this.message = message;
        this.status = status;

        Error.captureStackTrace(this, ErrorExpress)
    }
}

module.exports = ErrorExpress