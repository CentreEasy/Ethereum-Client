# CESC: sCalability for Ethereum Smart Contracts


## EthereumClient
  
 
##### EthereumClient Require Example
```js
var {Action, ContractModule, EthereumClient} = require('../test')('amqp://localhost','localhost','ethereum-client-test');
```

##Modules
This project contents different modules in one. Let's check it ou the different ones:

### Action Module
This module, allows to create actions and their associated transactions.

##### New action
```js
let actionClient = await new Action("action-buy-car", userId, [{collectionName: "cars", collectionObjectId: "5c9b60a39d3e152f1891b921"}]);
```

##### New Transaction
```js
    var result = actionClient.transaction(
                    "setString",
                    [web3.utils.fromAscii("name"), "stringName"],
                    contractStorage.simple.address,
                    userAddress,
                    userPrivateKey,
                    transactionValue
            );
```


### Contract Module
This module allows to create and store into the mongo database the contracts you need on your project and for each one 
their own abi.

```js
let saveContract = await ContractModule.saveContractAbi(contractStorage.simple.address, JSON.stringify(contractStorage.simple.abi), "SimpleContract");
```

Once you stored your contracts in the database, you can retrieve the contract information with their name, when you create
a transaction.

```js
 actionClient.transaction(
        "setSimpleInt",
        [15],
        contractName,
        userAddress.toLowerCase(),
        userPrivateKey,
        transactionValue
 );
```


### Event Module
This modules allows to capture or emit new events with the EventEmitter. Also this model capture 3 predefined events:
- on('hash'):  When we gets the hash for a transaction that we send to the blockchain. 

- on('error'): When the transaction fails. Also this event emits another one, that can be treated externally with 
the action name:

```js
  transactionEvents.emit(actionObject.name + ".on-error", actionObject);
```
- on('validated'): When the transaction achieve the number of confirmations you set in the configuration file.
Also this event emits "actionName.on-completed" event if necessary. This only happens when all the transactions for 
a specific action have been finished successfully:

```js
  transactionEvents.emit(actionObject.name + ".on-completed", actionObject);
```

### Error Module
This Module allows to create a new Error, with a custom message and code.
 
Requiere
 
```js
    const {ErrorWeb3} = require('../Ethereum Client/ErrorModule');
```

 Utilitzation
```js
    if(!trx){
            throw new ErrorWeb3("Transaction doesn't exist in the blockchain", ErrorWeb3.TRANSACTION_NOT_EXIST);
     }
```



## Usage