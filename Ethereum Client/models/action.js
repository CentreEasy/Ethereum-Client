// Load the things we need
var mongoose = require('mongoose');
var Transaction = require('./transaction');

// Define the schema for our user model
//TODO add attribute name at returnParameters
var ActionsSchema = mongoose.Schema({
    name: String,
    status: Number,
    userId: {type: mongoose.Schema.Types.ObjectId},
    listSubActions: [{name: String, transactionId: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'},  _id : false}],
    returnParameters: [{modelNameId: String, collectionName: String, collectionObjectId: {type: mongoose.Schema.Types.ObjectId},  _id : false}],
    jsonParameters: String,
    hasOrder: {type: Boolean, default: false},
}, { collection: 'ec_actions' });

// Methods
ActionsSchema.methods.getParameters = async function(mongoosep = null) {
    let mongo = mongoose;
    let customMongo = false;
    if (mongoosep) {
        customMongo = true;
        mongo = mongoosep;
    }

    let ret = {};

    // Parse return parameters
    if (this.returnParameters) {
        for(var i of this.returnParameters ){
            if (customMongo && i.modelNameId) {
                ret[i.collectionName] = await mongo.model(i.modelNameId).findOne(i.collectionObjectId);
            } else {
                let collection = mongo.connection.db.collection(i.collectionName);
                if (collection) {
                    ret[i.collectionName] = await collection.findOne(i.collectionObjectId);
                }
            }
        }
    }

    // Parse json parameters
    if (this.jsonParameters) {
        Object.assign(ret, JSON.parse(this.jsonParameters));
    }

    return ret;
};

ActionsSchema.methods.getLastTransactionHash = async function() {
    if (this.listSubActions && this.listSubActions.length > 0) {
        let lastTxObject = this.listSubActions[this.listSubActions.length-1];
        let txObject = await Transaction.findOne(lastTxObject.transactionId);
        if (txObject) {
            return txObject.hash;
        }
    }
    return null;
};

ActionsSchema.methods.getEvent = function(name) {
    if (this.events && this.listSubActions.length > 0) {
        for (let event of this.events) {
            if (event.name === name) {
                return event.result;
            }
        }
    }
    return null;
};

ActionsSchema.methods.getEvents = function (name = null) {
    if (name === null) return this.events;
    let events = [];
    if (this.events && this.listSubActions.length > 0) {
        for (let event of this.events) {
            if (event.name === name) {
                events.push(event.result);
            }
        }
    }
    return events;
};

// Create the model
module.exports = mongoose.model('Actions', ActionsSchema);

// constants
module.exports.STATUS_PENDING = 1;
module.exports.STATUS_SUCCESS = 2;
module.exports.STATUS_ERROR = 3;
