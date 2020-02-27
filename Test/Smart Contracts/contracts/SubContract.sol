pragma solidity >=0.4.24 <0.6.0;

contract SubContract {

    /* Owner modifier */
    address owner;

    /**** Global Mappings ***********/

    constructor() public {
        owner = msg.sender;
    }

    function getOwner() public returns (address owner) {
        return owner;
    }

}
