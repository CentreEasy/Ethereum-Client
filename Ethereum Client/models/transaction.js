// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// define the schema for our user model
var transactionSchema = mongoose.Schema({
    hash : String,
    from: String, //{ type: Schema.Types.ObjectId, ref: 'User' },
    to: String,  //{ type: Schema.Types.ObjectId, ref: 'User' },
    type: String,
    data: String,
    value: Number,
    tx: String,
    description:String,
    preHashId: String,
    status: Number,
    date:{ type: Date, default: Date.now }
}, { collection : 'ec_transactions' });

// create the model for users and expose it to our app
module.exports = mongoose.model('Transaction', transactionSchema);

// checking if password is valid
transactionSchema.methods.setTx = async function(txHash) {
    this.tx = txHash;
    return await this.save();
};

// constants
module.exports.STATUS_CREATED = 0;
module.exports.STATUS_PENDING = 1;
module.exports.STATUS_SUCCESS = 2;
module.exports.STATUS_ERROR = 3;
module.exports.STATUS_TIMEOUT = 4;
