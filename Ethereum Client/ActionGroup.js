var ActionGroupModel = require('./models/actiongroup');

class ActionGroup {

    constructor(name, returnParameters = null, jsonParameter = null) {
        this.id = null;
        this.name = name;
        this.actions = [];
        this.returnParameters = [];

        if (returnParameters) {
            this.returnParameters = returnParameters;
        }

        this.jsonParameters = null;
        if (jsonParameter) {
            this.jsonParameters = JSON.stringify(jsonParameter);
        }

        this.order = false;
        this.saveReturnParamsToDB = false;
    }

    addObjectModel(object) {
        try {
            this.returnParameters.push({
                modelNameId: object.constructor.modelName,
                collectionName: object.collection.collectionName,
                collectionObjectId: object._id,
            });
        } catch (e) {
            console.error("Can't parse the object model")
            console.error(e);
        }
        return this;
    }

    addGenericParams(object) {
        this.jsonParameters = JSON.stringify(object);
        return this;
    }

    add(action, dependsOn = 0){
        this.actions.push({action: action, dependsOn: dependsOn});
        return this;
    }


    setSaveReturnParamsToDB(value){
        this.saveReturnParamsToDB = value;
        return this;
    }


    async send(){
        if(this.actions.length > 0) {

            const mongoSession = await ActionGroupModel.startSession();
            mongoSession.startTransaction();

            try {

                let listActions = [];

                var actionGroupModel = new ActionGroupModel();
                actionGroupModel.name = this.name;
                actionGroupModel.status = ActionGroupModel.STATUS_PENDING;
                actionGroupModel.order = this.order;

                if(this.saveReturnParamsToDB){
                    actionGroupModel.returnParameters = this.returnParameters;
                    actionGroupModel.jsonParameters = this.jsonParameters;
                }

                await actionGroupModel.save();
                this.id = actionGroupModel._id;

                //Save Actions And Create List
                for (let i = 0; i < this.actions.length; i++) {

                    await this.actions[i].action.save();

                    var transactionsClonedArray = JSON.parse(JSON.stringify( this.actions[i].action.listSavedTransactions));

                    let actionElement = {
                        actionId: this.actions[i].action.id.toString(),
                        actionHasOrder: this.actions[i].action.hasOrder,
                        transactionList: transactionsClonedArray,
                        dependsOn: this.actions[i].dependsOn,
                        returnParameters: this.actions[i].action.returnParameters,
                        jsonParameters: this.actions[i].action.jsonParameters,
                    };

                    //this.listSavedTransactions
                    listActions.push(actionElement);

                    //In any case we store it at the database
                    let updateAction = await ActionGroupModel.updateOne({_id: actionGroupModel._id},
                        {
                            $push: {
                                "listSubActions": {dependsOn: this.actions[i].dependsOn,
                                    action: this.actions[i].action.id}
                            }
                        });
                }


                //Send Necessary Actions
                for (let i = 0; i < this.actions.length; i++) {

                    this.actions[i].action.addActionList(listActions);
                    this.actions[i].action.addGroupActionReturnParameters(this.returnParameters);
                    this.actions[i].action.addGroupActionJsonParameters(this.jsonParameters);

                    if(this.actions[i].dependsOn === 0) {
                        await this.actions[i].action.send();
                    }
                }

                await mongoSession.commitTransaction();
                mongoSession.endSession();

            } catch (error) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
            }
        }
    }
}

module.exports = ActionGroup;