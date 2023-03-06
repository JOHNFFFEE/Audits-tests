// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MockERC721 is ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter internal _total;

    constructor() ERC721("MockERC721", "MOCK-ERC721") {}

    function safeMint(address to) public  {
        uint256 tokenId = _total.current();
        _total.increment();
        _safeMint(to, tokenId);
    }
}