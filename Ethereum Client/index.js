
var EthereumClient = require('./EthereumClient');

var Action = require('./Action')(EthereumClient);
var ActionGroup = require('./ActionGroup');
var ContractModule = require('./ContractModule');
var ErrorModule = require('./ErrorModule');
var Utility = require('./Utility');
var Transactions = require('./models/transaction');

module.exports = {

    EthereumClient: EthereumClient,
    ActionGroup:ActionGroup,
    Action: Action,
    ContractModule: ContractModule,
    ErrorWeb3: ErrorModule,
    Utils: Utility,
    Transaction:Transactions,
    config:function(ampqserver,network,project,database){
        EthereumClient.config(ampqserver,network,project,database);
    }

};