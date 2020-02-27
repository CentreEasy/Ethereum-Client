var ActionModel = require('./models/action');
var Transaction = require('./models/transaction');

var actionModule = function(EthereumClient) {

    class Action {

        constructor(name, user = null, returnParameters = null, jsonParameter = null) {

            this.sender = EthereumClient;
            this.name = name;
            this.user = user;
            this.listSavedTransactions = [];
            this.transactions = [];
            this.returnParameters = [];
            this.id = null;
            if (returnParameters) {
                this.returnParameters = returnParameters;
            }
            this.jsonParameters = null;
            if (jsonParameter) {
                this.jsonParameters = JSON.stringify(jsonParameter);
            }
            this.hasOrder = false;
            this.saveReturnParamsToDB = false;
            this.saveAction = true;

            //Group Action Attributes
            this.listGroupActions = [];
            this.actionGroupJsonParameters = null;
            this.actionGroupReturnParameters = null;
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

        transaction(functionName, listParams, contractValue, senderAddress=null, senderPrivateKey =null,transactionDescription=null,transactionValue = null) {

            let privateKey = senderPrivateKey;
            let senderAddr = senderAddress;

            if (senderAddress === null || senderPrivateKey===null){
                let wallet=this.sender.getMainHdWallet();
                privateKey=wallet.privateKey;
                senderAddr=wallet.address;
            }


            var transactionValues = {};

            transactionValues.functionName = functionName;
            transactionValues.listParams = listParams;
            transactionValues.transactionDescription = transactionDescription;
            transactionValues.contractValue = contractValue;
            transactionValues.senderAddress = senderAddr;
            transactionValues.senderPrivateKey = privateKey;
            transactionValues.transactionValue = transactionValue;

            this.transactions.push(transactionValues);

            return this;
        }

        setHasOrder(orderValue){
            this.hasOrder = orderValue;
            return this;
        }

        setSaveReturnParamsToDB(value){
            this.saveReturnParamsToDB = value;
            return this;
        }

        setSaveAction(value){
            this.saveAction = value;
            return this;
        }

        addActionList(actionList){
            this.listGroupActions = actionList.slice();
            return this;
        }

        addGroupActionReturnParameters(value){
            this.actionGroupReturnParameters = value;
            return this;
        }

        addGroupActionJsonParameters(value){
            this.actionGroupJsonParameters = value;
            return this;
        }

        async save() {
            if (this.transactions.length > 0) {

                const session = await ActionModel.startSession();
                session.startTransaction();

                try {

                    var actionModel = new ActionModel();
                    actionModel.name = this.name;
                    actionModel.userId = this.user;
                    actionModel.status = ActionModel.STATUS_PENDING;
                    actionModel.hasOrder = this.hasOrder;

                    if(this.saveReturnParamsToDB){
                        actionModel.returnParameters = this.returnParameters;
                        actionModel.jsonParameters = this.jsonParameters;
                    }

                    await actionModel.save();
                    this.id = actionModel._id;
                    for (let i = 0; i < this.transactions.length; i++) {

                        var resultTransaction = await this.sender.getTransactionData(
                            this.transactions[i].functionName,
                            this.transactions[i].listParams,
                            this.transactions[i].contractValue,
                            this.transactions[i].senderAddress,
                            this.transactions[i].senderPrivateKey,
                            this.transactions[i].transactionValue
                        );

                        let newTransaction = new Transaction({
                            hash: null,
                            verified: 0,
                            from: resultTransaction.senderAddress,
                            to: resultTransaction.toAddress,
                            data: resultTransaction.data,
                            value: resultTransaction.value,
                            description: this.transactions[i].transactionDescription,
                            status: Transaction.STATUS_CREATED
                        });

                        let saveTransactionResult = await newTransaction.save();

                        let updateAction = await ActionModel.updateOne({_id: actionModel._id}, {
                            $push: {
                                "listSubActions": {
                                    name: resultTransaction.functionName,
                                    transactionId: saveTransactionResult._id
                                }
                            }
                        });

                        if (updateAction.nModified === 0) {
                            throw Error('Subaction of Action Not Modified');
                        }

                        resultTransaction.transactionId = saveTransactionResult._id;
                        this.listSavedTransactions.push(resultTransaction);
                    }

                    await session.commitTransaction();
                    session.endSession();

                    this.saveAction = false;

                    return this;

                } catch (error) {
                    await session.abortTransaction();
                    session.endSession();
                }
            }
        }


        async send() {

            if(this.saveAction){
                await this.save();
            }

            //If order is important
            if(this.hasOrder && this.listSavedTransactions.length > 1){

                //Send only the first transaction
                let savedTransaction = this.listSavedTransactions[0];

                //Remove the first element
                this.listSavedTransactions.shift();

                savedTransaction.listNextTransactions = this.listSavedTransactions;
                savedTransaction.hasOrder = true;

                //This is only for the action that belongs to a groupAction. This is not necessary to be at database
                if(typeof this.listGroupActions !== "undefined" && this.listGroupActions.length > 0){
                    savedTransaction.listGroupActions = this.listGroupActions;
                    savedTransaction.actionGroupJsonParameters = this.actionGroupJsonParameters;
                    savedTransaction.actionGroupReturnParameters = this.actionGroupReturnParameters;
                }

                //Save action parameters to database
                if(!this.saveReturnParamsToDB){
                    savedTransaction.returnParameters = this.returnParameters;
                    savedTransaction.jsonParameters = this.jsonParameters;
                }

                //Send transaction
                this.sender.sendTransaction(savedTransaction);

            }else{

                //if order is not important, send all transactions to the queue
                for (let i = 0; i < this.listSavedTransactions.length; i++) {
                    let savedTransaction = this.listSavedTransactions[i];

                    //This is only for the action that belongs to a groupAction. This is not necessary to be at database
                    if(typeof this.listGroupActions !== "undefined" && this.listGroupActions.length > 0){
                        savedTransaction.listGroupActions = this.listGroupActions;
                        savedTransaction.actionGroupJsonParameters = this.actionGroupJsonParameters;
                        savedTransaction.actionGroupReturnParameters = this.actionGroupReturnParameters;
                    }

                    if(!this.saveReturnParamsToDB){
                        savedTransaction.returnParameters = this.returnParameters;
                        savedTransaction.jsonParameters = this.jsonParameters;
                    }

                    this.sender.sendTransaction(savedTransaction);
                }
            }
        }


        static sendTransaction(functionName, listParams, contractValue, senderAddress=null, senderPrivateKey=null, transactionDescription=null, transactionValue=null) {
            let action = new Action(functionName);
            action.transaction(
                functionName,
                listParams,
                contractValue,
                senderAddress,
                senderPrivateKey,
                transactionDescription,
                transactionValue
            );
            return action.send();
        }
    }

    return Action;
};

module.exports = actionModule;