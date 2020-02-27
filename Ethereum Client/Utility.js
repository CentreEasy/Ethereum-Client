
var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider(""));

exports.strToBytes = function(str) {
    return web3.utils.fromAscii(str);
};

module.exports = exports;