class ErrorModule {

    static get TRANSACTION_NOT_EXIST() { return 1; }
    static get TRANSACTION_PENDING_IN_QUEUE() { return 2; }
    static get TRANSACTION_ERROR() { return 3; }

    constructor(message, code) {
        this.errorMessage = message;
        this.code = code;
    }

    getErrorMessage(){
        return this.errorMessage;
    }

    getCode(){
        return this.code;
    }
}

module.exports = ErrorModule;