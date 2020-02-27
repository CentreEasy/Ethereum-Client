pragma solidity >=0.4.24 <0.6.0;

import "./SubContract.sol";

contract SimpleContract {

    /**** General Attributes ***********/
    mapping (bytes32 => string) stringAttributes;
    mapping (bytes32 => int) intAttributes;
    int simpleInt;

    /**** Global Mappings ***********/

    constructor() public {

    }

    // ----------------------------------------------
    // -----------------  Events --------------------
    // ----------------------------------------------

    event SetInt(int value);

    event TestEvent(string hello, uint bye);

    event ContractCreation(address adr);


    // -----------------------------------------------
    // ---------------  Get General ------------------
    // -----------------------------------------------

    function getString(bytes32 key) public returns (string memory String) {
        return stringAttributes[key];
    }

    function getInt(bytes32 key) public returns (int) {
        return intAttributes[key];
    }

    // -----------------------------------------------
    // ---------------  Set General ------------------
    // -----------------------------------------------

    // Setters for general attributes
    function setString(bytes32 key, string memory value) public {
        stringAttributes[key] = value;
    }

    function setInt(bytes32 key, int value) public {
        intAttributes[key] = value;
    }

    function setSimpleInt(int i) public {
        simpleInt = i;
    }

    function greaterThanTen(int value) public {
        require(value > 10);
    }

    function setSimpleIntEvent(int i) public {
        simpleInt = i * 2;
        emit SetInt(simpleInt);
    }

    // ---------------------------------------------------
    // ---------------  Create Contract ------------------
    // ---------------------------------------------------

    function createContract() public {
        // Create new Smart Contrcat
        address scAddress = new SubContract();
        // Emit the event
        emit ContractCreation(scAddress);
        emit ContractCreation(scAddress);
    }


}
