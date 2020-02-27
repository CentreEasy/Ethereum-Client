// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var Schema = mongoose.Schema({
    text: String,
    creationDate: { type: Date, default: Date.now }
}, { collection: 'ec_abis' });

// methods ======================

// create the model for users and expose it to our app
module.exports = mongoose.model('Abi', Schema);
