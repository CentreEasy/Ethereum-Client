// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var Schema = mongoose.Schema({
    text: String,
    number: Number,
}, { collection: 'ec_example' });

// methods ======================

// create the model for users and expose it to our app
module.exports = mongoose.model('Example', Schema);
