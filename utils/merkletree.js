const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const { network } = require("hardhat");

const getMerkleTree = (addressArray) => {
  const whitelistedAddresses = addressArray;
  const leafNodes = [];
  for (var i = 0; i < whitelistedAddresses.length; i++) {
    // if (network.config.chainId != 31337) {
    leafNodes.push(keccak256(whitelistedAddresses[i]));
    // } else {
    // leafNodes.push(keccak256(whitelistedAddresses[i].address));
    // }
  }
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  return merkleTree;
};

const getMerkleRoot = (merkleTree) => {
  const merkleRoot = merkleTree.getRoot();
  return "0x" + merkleRoot.toString("hex");
};

const getMerkleProof = (merkleTree, address) => {
  return merkleTree.getHexProof(keccak256(address));
};

module.exports = {
  getMerkleTree,
  getMerkleRoot,
  getMerkleProof,
};
