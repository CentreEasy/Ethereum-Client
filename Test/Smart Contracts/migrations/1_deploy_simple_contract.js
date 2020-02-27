var SimpleContract = artifacts.require("SimpleContract");

var Web3 = require('web3');
var fs = require('fs');

var writeToFile = function (simple = null){
    var contractsContent = {};

    if (simple != null){
        contractsContent.simple = {address: simple.address, abi: simple.abi};
    }

    fs.writeFileSync("../contracts.json", JSON.stringify(contractsContent));
};

module.exports = async function(deployer) {

    // Hack logger
    let logger = console.log;
    console.log = function(){};
    logger("");

    // Web3 Object
    let web3 = new Web3(deployer.provider);

    // Deploy a contract
    let deployContract = async function(contract, param = null) {
        logger("Deploying " + contract.contractName + "...");
        let instance;
        if (!param) {
            instance = await contract.new();
        } else {
            instance = await contract.new(param);
        }
        await logContractInstance(instance);
        return instance;
    };

    // Log gas function
    let logContractInstance = async function(instance) {
        logger("  address: " + instance.address);
        if (instance.transactionHash) {
            logger("  tx: " + instance.transactionHash);
            let receipt = await web3.eth.getTransactionReceipt(instance.transactionHash);
            if (receipt) {
                logger("  gas: " + receipt.gasUsed);
            }
        }
    };

    deployer.then(async function() {

        writeToFile("");

        // Deploy SimpleCotract
        let SimpleContractInstance = await deployContract(SimpleContract);

        // Write to file
        writeToFile(SimpleContractInstance);

        logger("");
        console.log = logger;

    }).catch(function(e){
        console.log("--- Error ---");
        console.error(e);
    });

};
