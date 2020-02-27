var ContractModel = require('./models/contracts');
var AbiModel = require('./models/abi');

exports.getContractModel = async function(contractValue) {
    try {
        return await ContractModel.findOne({$or: [{name: contractValue.toLowerCase()}, {address: contractValue.toLowerCase()}]}).populate('abi');
    } catch (error) {
        console.log(error);
        return null;
    }
};

exports.getContractAbi = async function(contractValue) {
    try {
        let contractModel = await exports.getContractModel(contractValue);
        if (contractModel) {
            return {contractAddress: contractModel.address, contractName: contractModel.name, contractAbi: JSON.parse(contractModel.abi.text)};
        }
    } catch (error) {
        console.error(error);
    }
    return null;
};

exports.saveContractAbi = async function(contractAddress, contractAbi, contractName = null) {
    try {
        if (!contractName) {
            contractName = contractAddress;
        }

        var abiModel = await AbiModel.findOne({text: contractAbi});

        if (abiModel === null && contractAbi) {
            abiModel = new AbiModel();
            abiModel.text = contractAbi;
            abiModel = await abiModel.save();
        }

        let contractModel = await exports.getContractModel(contractName.toLowerCase());
        if (!contractModel) {
            contractModel = new ContractModel();
        }

        contractModel.name = contractName.toLowerCase();
        contractModel.address = contractAddress.toLowerCase();
        contractModel.abi = abiModel._id;
        await contractModel.save();

        return this;

    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports = exports;