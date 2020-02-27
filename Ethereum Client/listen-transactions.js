/**
 * Node.js Login Boilerplate
 * More Info : http://kitchen.braitsch.io/building-a-login-system-in-node-js-and-mongodb/
 * Copyright (c) 2013-2016 Stephen Braitsch
 **/

var Web3 = require('web3');
var config = require('./config/config.js');

var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect(config.database.url);


/**** VARIABLES */

// Ethereum network provider
//var provider = "http://localhost:8545";
var provider = "wss://rinkeby.infura.io/ws";

/**** CONSTANTS */
const web3 = new Web3(new Web3.providers.WebsocketProvider(provider));


// let filter = web3.eth.filter('latest',
//     filter.watch(function(error, result) {
//         if (!error) {
//             let confirmedBlock = web3.eth.getBlock(web3.eth.blockNumber - 11)
//             if (confirmedBlock.transactions.length > 0) {
//                 confirmedBlock.transactions.forEach(function(txId) {
//                     let transaction = web3.eth.getTransaction(txId)
//                     if (transaction.to == account) {
//                         // Do something useful.
//                         console.log("12 confirmations received");
//                     }
//                 })
//             }
//         }
//     });



//TODO provar amb infura
//TODO provar d'obtenir el ultim block buscar transacció i si exexisteix canviar de pending a 1
//TODO la resta de transaccions amb un valor més gran que 1, sumar 1 fins a 12 confirmacions

var listenForTransactions = function() {

    console.log("---- Running watch! ----");

    // Instantiate subscription object
    //const subscription = web3.eth.subscribe('newBlockHeaders');
    const subscription = web3.eth.subscribe('pendingTransactions');


    // Subscribe to pending transactions
    subscription.subscribe((error, result) => {
        if (error) console.log(error)
    }).on('data', async (txHash) => {
            try {
                // Instantiate web3 with HttpProvider
                const web3Http = new Web3(provider);

                // Get transaction details
                const trx = await web3Http.eth.getTransaction(txHash);

                console.log(trx);

                //const valid = validateTransaction(trx);

                // If transaction is not valid, simply return
                //if (!valid) return

                // console.log('Found incoming Ether transaction from ' + process.env.WALLET_FROM + ' to ' + process.env.WALLET_TO);
                // console.log('Transaction value is: ' + process.env.AMOUNT)
                // console.log('Transaction hash is: ' + txHash + '\n')

                // Initiate transaction confirmation
                //confirmEtherTransaction(txHash)

                // Unsubscribe from pending transactions.
                //subscription.unsubscribe()
            }
            catch (error) {
                console.log(error)
            }
    });

};

var newBlockEvent = function() {

    console.log("---- New Block Event Listening ----");
    const subscription = web3.eth.subscribe('newBlockHeaders');

    subscription.subscribe((error, result) => {
        if (error) console.log(error)
    }).on('data', async (block) => {
        try {

            //let confirmedBlock = await web3.eth.getBlock(block.number);
            console.log("New Block Added!!");
            //TODO do something here
            console.log(block);

        }catch (error) {
            console.log(error)
        }
    });

};


//listenForTransactions();
newBlockEvent();

// doAllTransactions().then(function () {
//     console.log("FINISH!");
//     process.exit();
// }).catch(function (e) {
//     console.error("ERROR");
//     console.error(e);
//     process.exit();
// });