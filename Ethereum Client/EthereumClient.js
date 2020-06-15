const ContractModule = require('./ContractModule');
const EventModule = require ('./EventModule');
const Cache = require('./Cache/ContractCache');

var util = require("util");
var Rabbot = require('rabbot');
var Rabbus = require("rabbus");

var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider(""));
var HDWalletProvider = require("truffle-hdwallet-provider");

var quiet=false;
var DBConfig="";
var RabbitMQConfig={};
var network= {};
var project="";
var ActionThreads = 1;
EventModule.on('sendTransaction',function(transactionObject){
    sendTransaction(transactionObject);
});

const wait = (ms) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};

async function waitForEmittedEvents() {
    if (EventModule.getCurrentEvents() === 0) return;
    await wait(250);
    return await waitForEmittedEvents();
}

async function close() {
    // Wait for current events
    await waitForEmittedEvents();
    // Stop queue connections
    Rabbot.closeAll();
}

var transactionSender = null;
var callRequester=null;
var actionReceiver = null;
// define the transactionSender
// ------------------

function TransactionSender(network_name){
    Rabbus.Sender.call(this, Rabbot, {
        exchange:  { name: 'transactions', type: 'topic', autoDelete: false, durable:true,persistent:true},
        routingKey: network_name
    });
}
util.inherits(TransactionSender, Rabbus.Sender);

// define a call requester
// ------------------

function CallRequester(network_name){
    Rabbus.Requester.call(this, Rabbot, {
        exchange: { name: 'calls', type: 'topic', autoDelete: false, durable:true,persistent:false},
        routingKey: network_name
    });
}
util.inherits(CallRequester, Rabbus.Requester);

// define action Receiver
// -------------------

function ActionReceiver(project_name,ActionThreads){
    Rabbus.Receiver.call(this, Rabbot, {
        exchange:  { name: 'actions', type: 'topic', autoDelete: false, durable:true,persistent:true},
        queue:  { name: 'actions-'+project_name, autoDelete: false,durable:true,noBatch:true,limit:ActionThreads},
        routingKey: project_name
    });
}
util.inherits(ActionReceiver, Rabbus.Receiver);

// start Rabbitmq connection

function start(){

    return  Rabbot.configure(RabbitMQConfig).then(() => {

        //set Call Requester
        callRequester=new CallRequester(network.name);

        //set Transaction Sender
        transactionSender = new TransactionSender(network.name);
        // basic error handler
        transactionSender.use(function(err, msg, propers, actions, next){
            setImmediate(function(){ throw err; });
        });

        //set Action Receiver
        actionReceiver = new ActionReceiver(project,ActionThreads);

        // basic error handler
        actionReceiver.receive(function(msga, propsa, actionsa, nexta){
            if (!quiet) console.log("action received with name: " + msga.event.name);
            EventModule.emit(msga.event.name, msga);
            actionsa.ack();
        });

    }).then(()=> {

        return mongoose.connect(DBConfig, { useNewUrlParser: true });

    }).catch(function (e) {
        console.error("ERROR");
        console.error(e.message);
        //process.exit();
    });
}

async function sendTransaction(transaction){
    //if (!quiet) console.log("Invalidating cache");
    Cache.invalidate(transaction.toAddress, transaction.functionName, transaction.params);
    if (!quiet) console.log("  Function: " + transaction.functionName + ". Parameters: " + JSON.stringify(transaction.params));

    transactionSender.send(transaction, function(){
        if (!quiet) console.log("published transaction "+transaction.transactionId);
    });
}


async function getTransactionData(functionName, parameters = [], contractValue, senderAddress, senderPrivateKey, transactionValue) {

    var transactionValues = {};

    try {

        let contractInfo = await ContractModule.getContractAbi(contractValue.toString());

        if(contractInfo != null){

            // Get data by params
            if (parameters === null) {
                parameters = [];
            }

            //Get Contract Data
            var contract = new web3.eth.Contract(contractInfo.contractAbi, contractInfo.contractAddress);
            var data = contract.methods[functionName].apply(null, parameters).encodeABI();

            //Return Prepared transaction
            transactionValues.functionName = functionName;
            transactionValues.senderAddress = senderAddress;
            transactionValues.senderPrivateKey = senderPrivateKey;
            transactionValues.toAddress =  contractInfo.contractAddress;
            transactionValues.data = data;
            transactionValues.params = parameters;
            transactionValues.value = transactionValue;
            transactionValues.project = project;
        }

        return transactionValues;

    } catch (e) {
        console.error("Function: " + functionName);
        console.error("Parameters: ");
        console.error(parameters);
        console.error(e);
        return null;
    }
}

function call(functionName, parameters = [], contractValue,fromAddress=null) {
    return new Promise( async function(resolve,reject){

        if (!quiet) console.log('Call:');
        if (!quiet) console.log('    function: '+functionName);
        if (!quiet) console.log('    param: '+JSON.stringify(parameters));
        if (!quiet) console.log('    contract: '+contractValue);
        if (!quiet) console.log('    from: '+fromAddress);

        let senderAddress=fromAddress;

        if(senderAddress==null){
            var wallet = getMainHdWallet();
            senderAddress = wallet.address;
        }
        if (!quiet) console.log('    sender: '+senderAddress);

        let contractInfo = await ContractModule.getContractAbi(contractValue.toString());
        if(!contractInfo) return reject(new Error('Contract Information Not Found in Database'));

        var contract = new web3.eth.Contract(contractInfo.contractAbi,contractInfo.contractAddress);

        let isInCache = await Cache.exists(contract.address, functionName, parameters);
        if (isInCache) {
            let cache_value = await Cache.get(contract.address, functionName, parameters);
            //if (!quiet) console.log("Got value from cache!");
            resolve(cache_value);
        } else {
            var callData = contract.methods[functionName].apply(null, parameters).encodeABI();
            let msg = {from: senderAddress, to: contractInfo.contractAddress, data: callData};

            callRequester.on('error',function(e){
                reject(e);
            });

            callRequester.request(msg,function (response) {
                if (!quiet) console.log("    response: " + JSON.stringify(response));
                var out = web3.eth.abi.decodeParameters(contract.jsonInterface.abi.methods[functionName].getOutputs(), response);
                //if (!quiet) console.log("Setting value into cache");
                Cache.set(contract.address, functionName, parameters, out);
                resolve(out);
            });
        }
    })
}

function getMainHdWallet(){
    var hdWallet = new HDWalletProvider(network.seed);
    let log = console.log;
    console.log = function() {};
    let address = hdWallet.getAddress(0);
    console.log = log;
    return {address: address, privateKey: hdWallet.wallets[address].getPrivateKey()};
}

function config(RabbitMQConfigp,networkp,projectp,DBConfigp,Actionthreads,quietp=false){
    RabbitMQConfig= RabbitMQConfigp;
    network= networkp;
    project= projectp;
    DBConfig=DBConfigp;
    ActionThreads=Actionthreads;
    quiet=quietp;
    EventModule.setQuiet(quiet);
}

function setCacheConfig(cacheConfig) {
    if (cacheConfig) {
        Cache.connect(cacheConfig);
    }
}

function setProjectCache(projectConfig) {
    Cache.addProject(projectConfig);
}

function clearCache() {
    Cache.clear();
}

function getRedisCache() {
    return Cache.getCache();
}

module.exports = {
    start:start,
    on: EventModule.on,
    emit: EventModule.emit,
    call:call,
    sendTransaction:sendTransaction,
    getTransactionData:getTransactionData,
    getMainHdWallet:getMainHdWallet,
    config:config,
    setCacheConfig:setCacheConfig,
    setProjectCache:setProjectCache,
    clearCache:clearCache,
    getRedisCache:getRedisCache,
    close:close
};
