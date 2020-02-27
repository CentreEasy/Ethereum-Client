
module.exports = function(ampqserver,network,project){

    const EthereumClient = require('./EthereumClient')(ampqserver,transactionQueue,actionQueue);
   // const EthereumClient = require('./EthereumClient')(ampqserver,transactionQueue,actionQueue);
    const Action = require('./Action')(EthereumClient);
    const ContractModule = require('./ContractModule');

 return   {
     Action,
     ContractModule,
     EthereumClient,
     }
}