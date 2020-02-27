#WeLicense: Smart Contracts Structure

Right now, the project has three main contracts: Storage, Files and Reader.

### Storage
This contract is accountable to store all the information related with the contract's project

### Files
This contract contains the main functions for uploading a file and for managing the access of the file for another users.

### Reader
This contract contains all the methods related with retrieve information from the storage contract

## Test
We can find in the test folder, a test of differents contracts of the project.
To run the the test you can execute the following command:

```
truffle test test/we-licens3d-test.js
```

## Truffle Suite


#### Update Truffle version

```
npm uninstall -g truffle
npm install -g truffle
```
#### Update Ganache

Download latest version [here](https://truffleframework.com/ganache)


#### Old Version of truffle

```
npm install -g truffle@4.1.14
```

- Truffle v4.1.14 (core: 4.1.14)
- Solidity v0.4.24 (solc-js)
- Ganache 1.2.2




