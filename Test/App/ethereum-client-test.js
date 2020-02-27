// Rabbit Config
var rabbitconf = require('./config/rabbitMQ.js');

// Require ethereum client
var {Action,ContractModule, EthereumClient, Utils, ErrorModule, ActionGroup} = require('easy-ethereum-client');


var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var fs = require('fs');
var Example = require('./models/example');

EthereumClient.on('action-test.on-completed', async (action) => {

    let params = await action.getParameters(mongoose);

    console.log('------ action-test.completed --------');

    console.log("Action Name: " + action.name);
    console.log("Action Return Parameters: " + JSON.stringify(params));
    console.log("Action UserId: " + action.userId);
    console.log("Action TX Hash: " + await action.getLastTransactionHash());
    console.log("Action Events:", action.getEvents("ContractCreation"));

    console.log("------ End action-test.completed --------");

   process.exit();
});

EthereumClient.on('action-test.on-error',function(parameters){
    console.error('------ action-test.error --------');
    console.log(parameters);
    //  process.exit();
});

EthereumClient.on('action-test1.on-completed',async function(action){
    console.log('------ action-test1.on-completed --------');
});


EthereumClient.on('action-group-test.on-completed',function(actionGroup){
    console.log('------ action-group-test.completed --------');
    for (let i = 0; i < actionGroup.listSubActions.length; i++) {
        let action = actionGroup.listSubActions[i].action;

        if (action != null && typeof action.status !== "undefined" && action.status === 2) { //status success
           console.log('action '+action.name+' finish with success');
        }

        if (action != null && typeof action.status !== "undefined" &&  action.status === 3) {  //status error
            console.log('action '+action.name+' finish with error');
        }
    }
    console.log("------ End action-group-test.completed --------");
  //  process.exit();
});

let initConnection = async function(){

    let dbConfig = "mongodb://localhost:27017/ethereum-client-test";

    await mongoose.connect(dbConfig, { useNewUrlParser: true });

    await EthereumClient.config(
        rabbitconf,
        { name: "localhost" },
        'ethereum-client-test',
        dbConfig
    );

    let storageData =  await  fs.readFileSync("../contracts.json", 'utf8');
    var contractStorage = JSON.parse(storageData);
    let cache_project = {
        name: "project1",
        addresses: [contractStorage.simple.address],
        invalidations: [
            {
                function:{name:"getString",params:["key"]},
                depends:[{name:"setString",params:["key","*"]}]
            }
        ]
    };
    EthereumClient.setProjectCache(cache_project);
    EthereumClient.clearCache();

    await EthereumClient.start();

};

let createActionObject = async function(){

    // Read Test Contracts info
    let storageData =  await  fs.readFileSync("../contracts.json", 'utf8');
    var contractStorage = JSON.parse(storageData);

    // Save contract
    let saveContract = await ContractModule.saveContractAbi(contractStorage.simple.address, JSON.stringify(contractStorage.simple.abi), "SimpleContract");
    if (!saveContract) {
        console.error("Cannot save contract");
        process.exit();
    }

    // Test Call
    // var res = await EthereumClient.call("greaterThanTen", [11], contractStorage.simple.address, "0xF0da4a887f0CFdc70A10Da4512a12b62D4cb109C");
    // console.log("Call result: " + res);

    // Second call (cached)
    // res = await EthereumClient.call("getString", [Utils.strToBytes("name")], contractStorage.simple.address, "0xF0da4a887f0CFdc70A10Da4512a12b62D4cb109C");
    // console.log("Call result: " + res);

    // Create example object
    // let example = new Example();
    // example.number = 2;
    // example.text = "Hello";
    // example = await example.save();

    // Create action and send it
    // var actionClient = await new Action("action-test")
    //     .addGenericParams({hola: "hello"})
    //     .transaction(
    //         "setSimpleIntEvent",
    //         [3],
    //         contractStorage.simple.address
    //     )
    //     .send();

    await new Action("action-test")
        .transaction(
            "createContract",
            [],
            contractStorage.simple.address
        )
        .send();


    // Create action group
    // var actiongroup = await new ActionGroup('action-group-test').add(
    //     new Action("action-test1", null, [{collectionName: "pepito", collectionObjectId: "asdasdadadaa"}])
    //         // .setHasOrder(true)
    //         .addObjectModel(example)
    //         .addGenericParams({hola: "hello"})
    //         .transaction(
    //             "setString",
    //             [Utils.strToBytes("name2"), "manolo"],
    //             contractStorage.simple.address
    //         )
    //         .transaction(
    //         "setString",
    //         [Utils.strToBytes("name5"), "manolo2"],
    //         contractStorage.simple.address
    //     ),0
    // ).add(
    //     new Action("action-test2", null, [{collectionName: "pepito", collectionObjectId: "asdasdadadaa"}])
    //         // .setHasOrder(true)
    //         .addObjectModel(example)
    //         .addGenericParams({hola: "hello"})
    //         .transaction(
    //             "setString",
    //             [Utils.strToBytes("name2"), "manolo"],
    //             contractStorage.simple.address
    //         ),1
    // ).add(
    //     new Action("action-test-2-1", null, [{collectionName: "pepito", collectionObjectId: "asdasdadadaa"}])
    //         // .setHasOrder(true)
    //         .addObjectModel(example)
    //         .addGenericParams({hola: "hello"})
    //         .transaction(
    //             "setString",
    //             [Utils.strToBytes("name2"), "wakaso"],
    //             contractStorage.simple.address
    //         ).transaction(
    //             "setInt",
    //             [Utils.strToBytes("name4"), 2],
    //             contractStorage.simple.address
    //         ),1
    // ).add(
    //     new Action("action-test3", null, [{collectionName: "pepito", collectionObjectId: "asdasdadadaa"}])
    //         // .setHasOrder(true)
    //         .addObjectModel(example)
    //         .addGenericParams({hola: "hello"})
    //         .transaction(
    //             "setString",
    //             [Utils.strToBytes("name2"), "manolo"],
    //             contractStorage.simple.address
    //         ),2
    // ).addGenericParams({pepito: "this is a test", numberValue: 2, booleanValue: true}).send();


};

initConnection()
    .then(createActionObject)
    .then(function () {
        console.log("FINISH!");
    }).catch(function (e) {
        console.error("ERROR");
        console.error(e);
    }).finally(function() {
        // process.exit();
    });
