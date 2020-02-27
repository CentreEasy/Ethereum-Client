pragma solidity >=0.4.24 <0.6.0;

library BitsUtilities {

    function and(bytes1 a, bytes1 b) public returns (bytes1) {
        return a & b;
    }

    function or(bytes1 a, bytes1 b) public returns (bytes1) {
        return a | b;
    }

    function xor(bytes1 a, bytes1 b) public returns (bytes1) {
        return a ^ b;
    }

//    function negate(bytes1 a) public returns (bytes1) {
//        return a ^ allOnes();
//    }

    function shiftLeft(bytes1 a, uint8 n) public returns (bytes1) {
        uint8 shifted = uint8(a) * 2 ** n;
        return bytes1(shifted);
    }

    function shiftRight(bytes1 a, uint8 n) public returns (bytes1) {
        uint8 shifted = uint8(a) / 2 ** n;
        return bytes1(shifted);
    }

    function getFirstN(bytes1 a, uint8 n) public returns (bytes1) {
        bytes1 nOnes = bytes1(2 ** n - 1);
        bytes1 mask = shiftLeft(nOnes, 8 - n); // Total 8 bits
        return a & mask;
    }

    function getLastN(bytes1 a, uint8 n) public returns (bytes1) {
        uint8 lastN = uint8(a) % 2 ** n;
        return bytes1(lastN);
    }

    // Sets all bits to 1
//    function allOnes() public returns (bytes1) {
//        return bytes1(-1); // 0 - 1, since data type is unsigned, this results in all 1s.
//    }

    // Get bit value at position
    function getBit(bytes1 a, uint8 n) public returns (bool) {
        return a & shiftLeft(0x01, n) != 0;
    }

    // Set bit value at position
    function setBit(bytes1 a, uint8 n) public returns (bytes1) {
        return a | shiftLeft(0x01, n);
    }

    // Set the bit into state "false"
//    function clearBit(bytes1 a, uint8 n) public returns (bytes1) {
//        bytes1 mask = negate(shiftLeft(0x01, n));
//        return a & mask;
//    }

    function toBytes (uint8 decimalValue) public returns (bytes memory c){
        //0 and 2n - 1
        require(decimalValue < 256);

        bytes1 b = bytes1(decimalValue);
        c = new bytes(1);
        for (uint i=0; i < 1; i++) {
            c[i] = b[i];
        }
    }
}