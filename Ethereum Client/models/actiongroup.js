// Load the things we need
var mongoose = require('mongoose');
var Actions = require('./action');

// Define the schema for our user model
var ActionsSchema = mongoose.Schema({
    name: String,
    status: Number,
    userId: {type: mongoose.Schema.Types.ObjectId},
    listSubActions: [{dependsOn: Number, action: {type: mongoose.Schema.Types.ObjectId, ref: 'Actions'}, _id : false}],
    returnParameters: [{modelNameId: String, collectionName: String, collectionObjectId: {type: mongoose.Schema.Types.ObjectId},  _id : false}],
    jsonParameters: String,
    order: {type: Boolean, default: false},
}, { collection: 'ec_actions_group' });

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


// Create the model
module.exports = mongoose.model('ActionsGroup', ActionsSchema);

// constants
module.exports.STATUS_PENDING = 1;
module.exports.STATUS_SUCCESS = 2;
module.exports.STATUS_ERROR = 3;