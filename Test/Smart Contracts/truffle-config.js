
var HDWalletProvider = require("truffle-hdwallet-provider");

var networkHost = "http://127.0.0.1:8545";
var networkSeed = "localhost";
var networkGasPrice = 1000000000;


var getHdWallet = function(network, seed) {
    const log = console.log;
    console.log = () => {};
    const hdWallet = new HDWalletProvider(seed, network);
    console.log = log;
    return hdWallet;
};
var getMainAddress = function(hdWallet){
    return hdWallet.getAddress(0);
};

module.exports = {
    compilers: {
        solc: {
            version: "0.4.24",
            optimizer: {
                enabled: true,
                runs: 200
            },
            evmVersion: "byzantium"
        },
    },
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: 5777,
            from: getMainAddress(getHdWallet(networkHost, networkSeed)),
            gas: 6721975,
            gasPrice: networkGasPrice, // 1 GWei
        },
        telsius: {
            provider: new HDWalletProvider("ethereum client test example", "http://n2.rabbit.centreeasy.com/rpc"),
            network_id: 83584648538,
            gasPrice: 0, // 1 GWei
        },

    }

};
