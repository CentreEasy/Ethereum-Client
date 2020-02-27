var Web3 = require('web3');

var util = require("util");
var Rabbus = require("rabbus");
var Rabbot = require("rabbot");
var config = require('./config');
var EthereumTx = require('ethereumjs-tx');

var currentWeb3 =  new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));

/**
 * Check if a web3 host is valid
 */
checkValidWeb3Host = async function(host) {
    var web3 = new Web3(new Web3.providers.HttpProvider(host));
    return await checkValidWeb3(web3);
};

/**
 * Check if a web3 object is connected
 */
checkValidWeb3 = async function(web3) {
    try {
        await web3.eth.getBalance("0x4d04eCCe6CA0Cc87f7490cf93A756C823757860a");
        return true;
    } catch (ex) {
        return false;
    }
};

/**
 * get web 3
 */
getWeb3 = async function() {
    // If we have a web3 object, check if it is valid
    if (currentWeb3 !== null && await checkValidWeb3(currentWeb3)) {
        return currentWeb3;
    }

    // Get a valid host from config
    var host = null;

    if (await checkValidWeb3Host(config.network.host)) {
        host = config.network.host;
    }

    if (host === null) {
        console.error("No valid Web3 hosts found");
        return null;
    }

    // Web3 Object
    // var web3 = new Web3(new Web3.providers.HttpProvider(host));
    // web3.eth.personal = new Web3EthPersonal(host);
    // currentWeb3 = web3;
    return true;
};


// Set transaction Receiver
var transactionReceiver=null;
function TransactionReceiver(){
    Rabbus.Receiver.call(this, Rabbot, {
        exchange:  { name: 'transactions', type: 'topic', autoDelete: false, durable:true,persistent:true},
        queue: { name:"transactions-"+config.network_name, autoDelete: false,durable:true,noBatch:true,limit:1},
        routingKey: config.network_name
    });
}
util.inherits(TransactionReceiver, Rabbus.Receiver);

//set pending transactions sender
var pendingTransactionsSender=null;
function PendingTransactionsSender(){
    Rabbus.Sender.call(this, Rabbot, {
        exchange:  { name: 'transactions-pending', type: 'topic', autoDelete: false, durable:true,persistent:true},
        routingKey: config.network_name
    });
}
util.inherits(PendingTransactionsSender, Rabbus.Sender);

//set Action sender
function ActionSender(key){
    Rabbus.Sender.call(this, Rabbot, {
        exchange:  { name: 'actions', type: 'topic', autoDelete: false, durable:true,persistent:true},
        routingKey: key
    });
}
util.inherits(ActionSender, Rabbus.Sender);

getWeb3().then((web3) => {
    Rabbot.configure({
        connection: {
            name: 'default',
            //user: 'guest',
            //pass: 'guest',
            host: 'localhost',
            //port: 5672,
            //vhost: '%2f',
            //replyQueue: 'customReplyQueue'
        },
        exchanges: [
            { name: 'transactions', type: 'topic', autoDelete: false, durable:true,persistent:true},
            { name: 'transactions-pending', type: 'topic', autoDelete: false, durable:true,persistent:true},
            { name: 'calls', type: 'topic', autoDelete: false, durable:true,persistent:false},
            { name: 'actions', type: 'topic', autoDelete: false, durable:true,persistent:true}
        ],
        queues: [
            { name: 'transactions-localhost', autoDelete: false,durable:true,noBatch:true,limit:1},
            { name: 'transactions-pending-localhost', autoDelete: false,durable:true,noBatch:true,limit:1},
            { name: 'calls-localhost', autoDelete: false,durable:false,noBatch:true,limit:1},
            { name: 'transactions-alastria', autoDelete: false,durable:true,noBatch:true,limit:1},
            { name: 'transactions-pending-alastria', autoDelete: false,durable:true,noBatch:true,limit:1},
            { name: 'calls-alastria', autoDelete: false,durable:false,noBatch:true,limit:1},
            { name: 'transactions-ethereum', autoDelete: false,durable:true,noBatch:true,limit:1},
            { name: 'transactions-pending-ethereum', autoDelete: false,durable:true,noBatch:true,limit:1},
            { name: 'calls-ethereum', autoDelete: false,durable:false,noBatch:true,limit:1},

        ],
        bindings: [
            { exchange: 'transactions', target: 'transactions-localhost', keys: "localhost" },
            { exchange: 'transactions', target: 'transactions-alastria', keys: "alastria" },
            { exchange: 'transactions', target: 'transactions-ethereum', keys: "ethereum" },
            { exchange: 'transactions-pending', target: 'transactions-pending-localhost', keys: "localhost" },
            { exchange: 'transactions-pending', target: 'transactions-pending-alastria', keys: "alastria" },
            { exchange: 'transactions-pending', target: 'transactions-pending-ethereum', keys: "ethereum" },
            { exchange: 'calls', target: 'calls-localhost', keys: "localhost" },
            { exchange: 'calls', target: 'calls-alastria', keys: "alastria" },
            { exchange: 'calls', target: 'calls-ethereum', keys: "ethereum" },

        ]
    })
}).then( () => {
    //set Transaction Receiver
    pendingTransactionsSender = new PendingTransactionsSender();

    transactionReceiver = new TransactionReceiver();

    transactionReceiver.receive(async function(message, properties, actions, next){
        console.log('transaction received');
        if (message !== null) {

            let nonce =null;
            let gasPrice = null;

            try {
                nonce = await currentWeb3.eth.getTransactionCount(message.senderAddress, "pending");
                console.log("Current Account Nonce -----------> "+nonce);
                gasPrice = await currentWeb3.eth.getGasPrice();
            }catch (e) {
                console.log(e);
            }

            var rawTx = {
                nonce: currentWeb3.utils.toHex(nonce),
                gasPrice: parseInt(gasPrice), // 0GWei
                gasLimit: 6500000,
                to: message.toAddress,
                value: currentWeb3.utils.toHex(message.value),
                data: message.data
            };

            var tx = new EthereumTx(rawTx);
            tx.sign(Buffer.from(message.senderPrivateKey, 'hex'));

            // Send transaction
            var serializedTx = tx.serialize();

            //make transaction
            currentWeb3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
                .on('transactionHash', async function (hash){

                    console.log('Transaction Send To the Blockchain');
                    console.log("We have the transaction hash at this moment");
                    console.log('Transaction with ObjectId: '+ message.transactionId +' and with hash: ' + hash);

                    // transaction send
                    message.hash = hash;
                    message.event = {name:'hash', params:{'hash': hash}};

                    pendingTransactionsSender.send(message, function(){
                        console.log('Transaction with ObjectId: '+ message.transactionId +' and Hash: '+ hash + ' send to validation queue');
                    });

                    var actionSender = new ActionSender(message.project);
                    actionSender.send(message, function(){
                        console.log('Transaction with ObjectId: ' + message.transactionId + ' send Hash action');
                    });

                    actions.ack();

                }).catch(function (error){ // on error

                var canRetry = true;
                if(canRetry){
                    console.log('transaction error: '+message.transactionId +' error Message: '+error.message+'. retry later');
                    actions.nack();
                }else{
                    message.event = {name: 'error',params: {}};
                    var actionSender = new ActionSender(message.project);
                    actionSender.send(message,function(){
                        console.log('transaction: '+message.transactionId+' send hash action ');
                    });
                    console.log('transaction error: '+message.transactionId +' error'+error.message+' send action error. and reject for ever');
                    actions.reject();
                }
            })
        }
    });

}).catch(function(e){
    console.log(e.message);
});
