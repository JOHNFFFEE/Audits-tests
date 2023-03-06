/** @type import('hardhat/config').HardhatUserConfig */

require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("hardhat-gas-reporter");

module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.17",
      },
      {
        version: "0.8.4",
      },
    ],
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      hardfork: process.env.IS_COVERAGE ? "berlin" : "arrowGlacier",
      gasPrice: 875000000,
      // gas: 6000000,
    },
  },
  gasReporter: {
    enabled: true,
    currency: "ETH",
    outputFile: "gas-report.txt",
    noColors: true,
  },
};
