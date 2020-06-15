const events = require('events');
const Transaction = require ('./models/transaction');
const Action = require ('./models/action');
const ActionGroup = require('./models/actiongroup');
const ParserModule = require('./ParserModule');

var quiet=false;
function setQuiet(quietp){
    quiet=quietp;
}

currentEvents = 0;

transactionEvents = new events.EventEmitter();

function on(action,callback){
    transactionEvents.on(action,async (action) => {
        currentEvents++;
        await callback(action);
        currentEvents--;
    });
}

function emit(eventName, args){
    transactionEvents.emit(eventName, args);
}

async function checkActionGroupCompleted(actionObject, transactionObj){

    //If all actions are finshed send action group completed event
    let actionGroup = await ActionGroup.findOne({"listSubActions.action":  actionObject._id}).populate('listSubActions.action');

    if(actionGroup != null){
        let count = 0;

        for (let i = 0; i < actionGroup.listSubActions.length; i++) {
            let action = actionGroup.listSubActions[i].action;

            //Add return parameters for the actions
            for(let x = 0; x < transactionObj.listGroupActions.length; x++){
                if(transactionObj.listGroupActions[x].actionId === action.id){
                    action.returnParameters = transactionObj.listGroupActions[x].returnParameters;
                    action.jsonParameters = transactionObj.listGroupActions[x].jsonParameters;
                }
            }

            if (action != null && typeof action.status !== "undefined" && (action.status === Action.STATUS_SUCCESS || action.status === Action.STATUS_ERROR)) {
                count++;
            } else {
                break;
            }
        }

        // check if all actions in the action group are finished (error or success)
        if(count === actionGroup.listSubActions.length){

            //Parameters for group Action
            if(typeof transactionObj.actionGroupJsonParameters !== "undefined"){
                actionGroup.jsonParameters = transactionObj.actionGroupJsonParameters;
            }

            if(typeof transactionObj.actionGroupReturnParameters !== "undefined"){
                actionGroup.returnParameters = transactionObj.actionGroupReturnParameters;
            }

            if(typeof transactionObj.logs !== "undefined"){
                actionGroup.events = await ParserModule.parseLogsToEvents(transactionObj.logs);
            }

            let updateActionGroup = await ActionGroup.updateOne({"_id": actionGroup._id},  {$set: {status: ActionGroup.STATUS_SUCCESS}});

            if (updateActionGroup.nModified) {
                transactionEvents.emit(actionGroup.name + ".on-completed", actionGroup);
            }
        }
    }
}


transactionEvents.on('hash',async function(obj){
    if (!quiet) console.log('transaction: ' + obj.transactionId + ' event ' + obj.event.name);

    let transaction = await Transaction.findOne({_id: obj.transactionId});

    if(transaction != null && transaction.hash === null){
        transaction.hash = obj.hash;
        transaction.status = Transaction.STATUS_PENDING;
        let resultSave = await transaction.save();
    }

    // try{
    //     if(typeof obj.hasOrder !== "undefined" && obj.hasOrder){
    //
    //         if(typeof obj.listNextTransactions !== "undefined" && obj.listNextTransactions != null && obj.listNextTransactions.length > 0){
    //             //Send next transaction to the queue
    //
    //             let nextTransaction = obj.listNextTransactions.shift();
    //
    //             if(obj.listNextTransactions.length > 0){
    //                 nextTransaction.hasOrder = true;
    //                 nextTransaction.listNextTransactions =  obj.listNextTransactions;
    //             }
    //
    //             //If this transaction is part of actionGroup, has to share the obj listgroupactions
    //             if(typeof obj.listGroupActions !== "undefined"){
    //                 nextTransaction.listGroupActions = obj.listGroupActions;
    //             }
    //
    //             if(typeof obj.returnParameters !== "undefined"){
    //                 nextTransaction.returnParameters = obj.returnParameters;
    //             }
    //
    //             if(typeof obj.jsonParameters !== "undefined"){
    //                 nextTransaction.jsonParameters = obj.jsonParameters;
    //             }
    //
    //             //Parameters for group Action
    //             if(typeof obj.actionGroupJsonParameters !== "undefined"){
    //                 nextTransaction.actionGroupJsonParameters = obj.actionGroupJsonParameters;
    //             }
    //
    //             if(typeof obj.actionGroupReturnParameters !== "undefined"){
    //                 nextTransaction.actionGroupReturnParameters = obj.actionGroupReturnParameters;
    //             }
    //
    //             transactionEvents.emit('sendTransaction', nextTransaction);
    //         }
    //     }
    // }catch (e) {
    //     if (!quiet) console.log("Error sending transaction order");
    // }

});

transactionEvents.on('error',async function(obj){
    if (!quiet) console.log('transaction: '+ obj.transactionId +' event '+ obj.event.name);

    let transaction = await Transaction.findOne({_id: obj.transactionId});

    if(transaction != null){
        transaction.status = Transaction.STATUS_ERROR;
        let resultSave = await transaction.save();
    }

    let updateAction = await Action.updateOne({"listSubActions.transactionId": obj.transactionId},  {$set: {status: Action.STATUS_ERROR}});

    if (updateAction.nModified) {
        let seachAction = await Action.findOne({"listSubActions.transactionId": obj.transactionId});

        if(typeof obj.returnParameters !== "undefined"){
            seachAction.returnParameters = obj.returnParameters;
        }

        if(typeof obj.jsonParameters !== "undefined"){
            seachAction.jsonParameters = obj.jsonParameters;
        }

        transactionEvents.emit(seachAction.name + ".on-error", seachAction);

        await checkActionGroupCompleted(seachAction, obj);
    }

});

transactionEvents.on('validated', async function(obj){
    if (!quiet) console.log('transaction: '+ obj.transactionId +' event '+ obj.event.name);
    let updateTransaction=null;
    try {
        updateTransaction = await Transaction.updateOne({"_id": obj.transactionId}, {$set: {status: Transaction.STATUS_SUCCESS}});
    }catch (e) {
        if (!quiet) console.log('error on event validated: '+e.message)
    }

    if (updateTransaction.nModified === 0) {
        throw Error('Transaction Not Modified');
    }

    //Check if if is the last transaction on action
    let seachAction = await Action.findOne({"listSubActions.transactionId":  obj.transactionId}).populate('listSubActions.transactionId');

    if(seachAction != null){
        if(seachAction.listSubActions.length > 0){

            let count = 0;
            for(let i=0; i < seachAction.listSubActions.length; i++){
                let transaction =  seachAction.listSubActions[i].transactionId;

                if(transaction != null && typeof transaction.status !== "undefined" &&  transaction.status === Transaction.STATUS_SUCCESS){
                    count++;
                }else{
                    break;
                }
            }

            if(count == seachAction.listSubActions.length){
                let updateAction = await Action.updateOne({"_id": seachAction._id},  {$set: {status: Action.STATUS_SUCCESS}});

                if (updateAction.nModified) {
                    //Emit Event Completed Action

                    if(typeof obj.returnParameters !== "undefined"){
                        seachAction.returnParameters = obj.returnParameters;
                    }

                    if(typeof obj.jsonParameters !== "undefined"){
                        seachAction.jsonParameters = obj.jsonParameters;
                    }

                    if(typeof obj.logs !== "undefined"){
                        seachAction.events = await ParserModule.parseLogsToEvents(obj.logs);
                    }

                    transactionEvents.emit(seachAction.name + ".on-completed", seachAction);
                }

                //check if completed action owns to a action group
                let actionGroup = await ActionGroup.findOne({"listSubActions.action":  seachAction._id}).populate('listSubActions.action');
                let count = 0;
                if(actionGroup) {

                    //Check positions for action in actionGroup
                    let currentActionPosition = null;

                    for (let i = 0; i < actionGroup.listSubActions.length; i++) {

                        let actionElement = actionGroup.listSubActions[i];

                        if(actionElement.action.id === seachAction.id){
                            currentActionPosition = i + 1; // Add one because list starts at 0
                        }

                        //Check if necessary to send the transaction
                        if(currentActionPosition != null && typeof actionElement.dependsOn !== "undefined" && actionElement.dependsOn === currentActionPosition && actionElement.dependsOn !== 0){

                            for(let x = 0; x < obj.listGroupActions.length; x++){

                                if(currentActionPosition === obj.listGroupActions[x].dependsOn){

                                    let listTransactions = JSON.parse(JSON.stringify(obj.listGroupActions[x].transactionList));

                                    if(typeof listTransactions !== "undefined" && listTransactions.length > 0){
                                        if(obj.listGroupActions[x].actionHasOrder){
                                            let nextTransaction = listTransactions.shift();


                                            if(listTransactions.length > 0){
                                                nextTransaction.hasOrder = true;
                                                nextTransaction.listNextTransactions = listTransactions;
                                            }

                                            //Pass the group actions to the others transactions
                                            nextTransaction.listGroupActions = obj.listGroupActions;

                                            //You have to get the return parameters from the current action
                                            if(typeof obj.listGroupActions[x].returnParameters !== "undefined"){
                                                nextTransaction.returnParameters = obj.listGroupActions[x].returnParameters;
                                            }

                                            if(typeof obj.listGroupActions[x].jsonParameters !== "undefined"){
                                                nextTransaction.jsonParameters = obj.listGroupActions[x].jsonParameters;
                                            }

                                            //Parameters for group Action
                                            if(typeof obj.actionGroupJsonParameters !== "undefined"){
                                                nextTransaction.actionGroupJsonParameters = obj.actionGroupJsonParameters;
                                            }

                                            if(typeof obj.actionGroupReturnParameters !== "undefined"){
                                                nextTransaction.actionGroupReturnParameters = obj.actionGroupReturnParameters;
                                            }


                                            transactionEvents.emit('sendTransaction', nextTransaction);
                                        }else{
                                            for(let count = 0; count < listTransactions.length; count++){

                                                let nextTransaction = listTransactions[count];
                                                nextTransaction.listGroupActions = obj.listGroupActions;

                                                nextTransaction.returnParameters = obj.listGroupActions[x].returnParameters;
                                                nextTransaction.jsonParameters = obj.listGroupActions[x].jsonParameters;

                                                //Parameters for group Action
                                                if(typeof obj.actionGroupJsonParameters !== "undefined"){
                                                    nextTransaction.actionGroupJsonParameters = obj.actionGroupJsonParameters;
                                                }

                                                if(typeof obj.actionGroupReturnParameters !== "undefined"){
                                                    nextTransaction.actionGroupReturnParameters = obj.actionGroupReturnParameters;
                                                }

                                                transactionEvents.emit('sendTransaction', nextTransaction);
                                            }
                                        }
                                    }else{
                                        //If an action doesn't have any transaction to do mark action with error status
                                        let updateAction = await Action.updateOne({"_id": obj.listGroupActions[x].actionId},  {$set: {status: Action.STATUS_ERROR}});
                                        if (updateAction.nModified) {
                                            let actionWithError = await Action.findOne({"_id": obj.listGroupActions[x].actionId});

                                            //Emit Event Completed Action
                                            transactionEvents.emit(actionWithError.name + ".on-error", actionWithError);
                                        }
                                    }
                                }
                            }

                            break;
                        }
                    }

                    await checkActionGroupCompleted(seachAction, obj);
                }
            }
        }
    }

});


transactionEvents.on('firstValidation', async function(obj){

    if (!quiet) console.log('---- First Validation Event ----');
    if (!quiet) console.log('FVE --> transaction: ' + obj.transactionId + ' event ' + obj.event.name);

    try{
        if(typeof obj.hasOrder !== "undefined" && obj.hasOrder){

            if(typeof obj.listNextTransactions !== "undefined" && obj.listNextTransactions != null && obj.listNextTransactions.length > 0){
                //Send next transaction to the queue

                let nextTransaction = obj.listNextTransactions.shift();

                if(obj.listNextTransactions.length > 0){
                    nextTransaction.hasOrder = true;
                    nextTransaction.listNextTransactions =  obj.listNextTransactions;
                }

                //If this transaction is part of actionGroup, has to share the obj listgroupactions
                if(typeof obj.listGroupActions !== "undefined"){
                    nextTransaction.listGroupActions = obj.listGroupActions;
                }

                if(typeof obj.returnParameters !== "undefined"){
                    nextTransaction.returnParameters = obj.returnParameters;
                }

                if(typeof obj.jsonParameters !== "undefined"){
                    nextTransaction.jsonParameters = obj.jsonParameters;
                }

                //Parameters for group Action
                if(typeof obj.actionGroupJsonParameters !== "undefined"){
                    nextTransaction.actionGroupJsonParameters = obj.actionGroupJsonParameters;
                }

                if(typeof obj.actionGroupReturnParameters !== "undefined"){
                    nextTransaction.actionGroupReturnParameters = obj.actionGroupReturnParameters;
                }

                transactionEvents.emit('sendTransaction', nextTransaction);
            }
        }
    }catch (e) {
        if (!quiet) console.log("Error sending transaction order");
    }
});




//transactionEvents.on('validated', async function(obj){
    // invalidate cache
    /*let contractValue = obj.contractValue;
    let contractInfo = null;
    if (contractValue.toString().startsWith("0x")) {
        contractInfo = await ContractModule.getContractAbiByAddress(contractValue);
    }else{
        contractInfo = await ContractModule.getContractAbiByName(contractValue);
    }
    if(!contractInfo)
        var contract = new web3.eth.Contract(contractInfo.contractAbi,contractInfo.contractAddress);
    let parameters = web3.eth.abi.decodeParameters(contract.jsonInterface.abi.methods[obj.functionName].getOutputs(),obj.data);
    Cache.invalidate(obj.functionName, parameters);*/
//});

exports.on = on;
exports.emit = emit;
exports.getCurrentEvents = () => {
    return currentEvents;
};
exports.setQuiet = setQuiet;
