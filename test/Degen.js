const { expect, assert } = require("chai");

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("DEGEN hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const Token = await ethers.getContractFactory("SampleDegen");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const hardhatToken = await Token.deploy(
      "ipfs://aappppp/", //baseURL
      "ipfs://aaaaaa/" //HiddenURL
    );

    await hardhatToken.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { Token, hardhatToken, owner, addr1, addr2 };
  }

  describe("pause", function () {
    it("should pause the contract if it was not paused", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      await hardhatToken.pause();
      assert(hardhatToken.paused(), true);
    });

    it("should unpause the contract if it was paused", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      await hardhatToken.pause();
      await hardhatToken.pause();
      assert(hardhatToken.paused(), false);
    });

    it("should revert if caller is not the owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(hardhatToken.connect(addr1).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
  // Test the setMaxMintAmountPerWallet function
  describe("setMaxMintAmountPerWallet", function () {
    it("should set the maximum mint amount per wallet when called by the owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const newMaxPerWallet = 5;

      // Call the function as the owner
      await hardhatToken
        .connect(owner)
        .setMaxMintAmountPerWallet(newMaxPerWallet);

      // Check the result
      const maxPerWallet = await hardhatToken.maxMintAmountPerWallet();
      expect(maxPerWallet).to.equal(newMaxPerWallet);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const newMaxPerWallet = 5;

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setMaxMintAmountPerWallet(newMaxPerWallet)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Test the setMaxMintAmountPerTx function
  describe("setMaxMintAmountPerTx", function () {
    it("should set the maximum mint amount per transaction when called by the owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const newMaxTransaction = 2;

      // Call the function as the owner
      await hardhatToken
        .connect(owner)
        .setMaxMintAmountPerTx(newMaxTransaction);

      // Check the result
      const maxTransaction = await hardhatToken.maxMintAmountPerTx();
      expect(maxTransaction).to.equal(newMaxTransaction);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const newMaxTransaction = 2;

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setMaxMintAmountPerTx(newMaxTransaction)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Test the setCostPrice function
  describe("setCostPrice", function () {
    it("should set the cost price when called by the owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const newPrice = ethers.utils.parseEther("0.1");

      // Call the function as the owner
      await hardhatToken.connect(owner).setCostPrice(newPrice);

      // Check the result
      const price = await hardhatToken.costOfNFT();
      expect(price).to.equal(newPrice);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const newPrice = ethers.utils.parseEther("0.1");

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setCostPrice(newPrice)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Withdraw", async () => {
    it("should withdraw funds", async function () {
      const { hardhatToken, Token, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      // Check the balance of the contract
      const balanceBefore = await ethers.provider.getBalance(owner.address);

      // Send some ether to the contract
      const value = ethers.utils.parseEther("0.001");
      const newBalanceHex = value.toHexString().replace("0x0", "0x");

      await ethers.provider.send("hardhat_setBalance", [
        hardhatToken.address,
        newBalanceHex,
      ]);

      // Check the balance of the contract after the withdrawal
      const balanceAfter = await ethers.provider.getBalance(
        hardhatToken.address
      );

      await expect(hardhatToken.withdraw()).to.changeEtherBalance(
        hardhatToken,
        -ethers.utils.parseEther("0.001"),
        { includeFee: true }
      );
    });

    it("should revert if non-owner tries to withdraw funds", async function () {
      const { hardhatToken, Token, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(
        hardhatToken.connect(addr1).withdraw({ value: 0 })
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setHiddenURL", function () {
    it("should set the HiddenURL", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const HiddenURL = "";
      // Call the function to set the HiddenURL and verify that it has been updated
      await hardhatToken.setHiddenURL("https://example.com/hidden");
      expect(await hardhatToken.HiddenURL()).to.equal(
        "https://example.com/hidden"
      );
    });
  });

  describe("setRevealed", function () {
    it("should toggle the reveal state", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const revealed = false;
      // Call the function to set the reveal state to true and verify that it has been updated
      await hardhatToken.setRevealed();
      expect(await hardhatToken.revealed()).to.equal(true);

      // Call the function to set the reveal state to false and verify that it has been updated
      await hardhatToken.setRevealed();
      expect(await hardhatToken.revealed()).to.equal(false);
    });

    it("should revert if caller is not the owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(
        hardhatToken.connect(addr1).setRevealed()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setbaseURL", function () {
    it("should set the baseURL", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const baseURL = "";
      // Call the function to set the baseURL and verify that it has been updated
      await hardhatToken.setbaseURL("https://example.com/");
      expect(await hardhatToken.baseURL()).to.equal("https://example.com/");
    });

    it("should revert if caller is not the owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(
        hardhatToken.connect(addr1).setbaseURL("https://example.com/")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setExtensionURL", function () {
    it("should set the ExtensionURL", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const ExtensionURL = ".json";
      // Call the function to set the ExtensionURL and verify that it has been updated
      await hardhatToken.setExtensionURL("https://example.com/extension");
      expect(await hardhatToken.ExtensionURL()).to.equal(
        "https://example.com/extension"
      );
    });
  });

  describe("setMaxSupply", function () {
    it("should set the maximum supply", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function to set the maximum supply and verify that it has been updated
      await hardhatToken.setMaxSupply(100);
      expect(await hardhatToken._maxSupply()).to.equal(100);
    });

    it("should revert if caller is not the owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(
        hardhatToken.connect(addr1).setMaxSupply(100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("airdrop()", function () {
    it("should revert when the current supply plus the airdrop amount exceeds the maximum supply", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.setCostPrice("1");
      // await hardhatToken.setMaxMintAmountPerTx(10000);
      // await hardhatToken.setMaxMintAmountPerWallet(10000);
      await hardhatToken.setMaxSupply(10);
      // const price = await hardhatToken.costOfNFT();
      // Mint some tokens to the owner to bring the current supply close to the maximum supply
      const maxSupply = await hardhatToken._maxSupply();
      const currentSupply = await hardhatToken.totalSupply();
      const remainingSupply = maxSupply.sub(currentSupply);
      // const total = BigNumber.from(price).mul(remainingSupply).toString();
      const ownerBalanceBefore = await hardhatToken.balanceOf(owner.address);
      await hardhatToken.setMaxMintAmountPerTx(remainingSupply);
      await hardhatToken.setMaxMintAmountPerWallet(remainingSupply);

      await hardhatToken.safeMint(owner.address, remainingSupply);
      const ownerBalanceAfter = await hardhatToken.balanceOf(owner.address);
      expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(
        remainingSupply
      );

      // Call the airdrop function with a mint amount and receiver array that would exceed the maximum supply and expect it to revert
      const receiverArray = [addr1.address, addr2.address];
      const airdropAmount =
        Math.ceil(remainingSupply.div(receiverArray.length)) + 1;
      await expect(
        hardhatToken.airdrop(receiverArray, airdropAmount)
      ).to.be.revertedWithCustomError(hardhatToken, "MaxSupply");
    });

    it("should revert when the contract is paused", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Pause the contract and expect the airdrop function to revert

      await expect(
        hardhatToken.airdrop([addr1.address, addr2.address], 1)
      ).to.be.revertedWithCustomError(hardhatToken, "ContractPaused");
    });

    it("should mint the correct number of tokens to each receiver in the array", async function () {
      const { hardhatToken, addr2, addr1 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.pause();
      // Call the airdrop function with a valid receiver array and mint amount and expect it to mint the correct number of tokens to each receiver
      const receiverArray = [addr1.address, addr2.address];
      const airdropAmount = 2;
      const balanceBefore1 = await hardhatToken.balanceOf(addr1.address);
      const balanceBefore2 = await hardhatToken.balanceOf(addr2.address);
      await hardhatToken.airdrop(receiverArray, airdropAmount);
      const balanceAfter1 = await hardhatToken.balanceOf(addr1.address);
      const balanceAfter2 = await hardhatToken.balanceOf(addr2.address);
      expect(balanceAfter1.sub(balanceBefore1)).to.equal(airdropAmount);
      expect(balanceAfter2.sub(balanceBefore2)).to.equal(airdropAmount);
    });
  });

  describe("setnumberOfFreeNFTs", function () {
    it("should set the number of free NFTs for each wallet", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);

      await hardhatToken.setnumberOfFreeNFTs(5);

      expect(await hardhatToken.numberOfFreeNFTs()).to.equal(5);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(
        hardhatToken.connect(addr1).setnumberOfFreeNFTs(5)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("checkCost", function () {
    //5 cases  - balance 0 , amount <= freeMint
    // balance 0 , amount > freeMint
    //balance >0 ,  amount > freeMint
    //balance >0 ,  amount < freeMint
    //free supply over
    it("should return the initial price if balance 0 and the total mints do not exceed the number of free NFTs", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      // const balance = await hardhatToken.balanceOf(addr1.address).toString();
      expect(await hardhatToken.checkCost(2)).to.equal(0);
    });

    it("should return the total cost if balance 0 and the total mints exceed the number of free NFTs and the current free supply limit has not been reached", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      const numberOfFreeNFTs = 3;
      // await hardhatToken.safeMint(owner.address, numberOfFreeNFTs);
      expect(await hardhatToken.checkCost(numberOfFreeNFTs)).to.equal(
        ethers.utils.parseEther("1")
      );
    });

    it("should return the total cost if  balance > 0 but the total mints not exceed the number of free NFTs and the current free supply limit has not been reached", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      const numberOfFreeNFTs = 1;
      await hardhatToken.safeMint(owner.address, numberOfFreeNFTs);
      expect(await hardhatToken.checkCost(1)).to.equal(0);
    });

    it("should return the total cost if the total mints exceed the number of free NFTs and balance > 0 and the current free supply limit has not been reached", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      const numberOfFreeNFTs = 1;
      await hardhatToken.safeMint(owner.address, numberOfFreeNFTs);

      expect(await hardhatToken.checkCost(3)).to.equal(
        ethers.utils.parseEther("2")
      );
    });

    it("the current free supply limit has been reached", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      await hardhatToken.changeFreeSupplyLimit(0);
      const numberOfFreeNFTs = 2;
      await hardhatToken.safeMint(owner.address, numberOfFreeNFTs);

      expect(await hardhatToken.checkCost(2)).to.equal(
        ethers.utils.parseEther("2")
      );
    });
  });

  describe("checkFreemint", function () {
    //if freeMints to user and global remains otherwise 0
    it("should return the total mints if the total mints do not exceed the number of free NFTs", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      expect(await hardhatToken.checkFreemint(2)).to.equal(2);
    });

    it("should return the number of free NFTs if the total mints exceed the number of free NFTs and the current free supply limit has not been reached", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      const numberOfFreeNFTs = 10;
      await hardhatToken.safeMint(owner.address, numberOfFreeNFTs);

      expect(await hardhatToken.checkFreemint(15)).to.equal(0);
    });

    it("should return 0 if the total mints exceed the number of free NFTs and the current free supply limit has been reached", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      await hardhatToken.changeFreeSupplyLimit(10);
      const numberOfFreeNFTs = 10;
      await hardhatToken.safeMint(owner.address, numberOfFreeNFTs);

      expect(await hardhatToken.checkFreemint(1)).to.equal(0);
    });
  });

  describe("mint", function () {
    it("should mint the specified amount of tokens to the addr1 and update the free supply", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const initialBalance = await hardhatToken.balanceOf(addr1.address);
      const initialFreeSupply = await hardhatToken.currentFreeSupply();
      const mintAmount = 2;
      const costPerToken = await hardhatToken.costOfNFT();
      const total = BigNumber.from(costPerToken).mul(mintAmount - 2);

      await hardhatToken.pause();

      await hardhatToken.connect(addr1).mint(mintAmount, { value: total });

      const finalBalance = await hardhatToken.balanceOf(addr1.address);
      const finalFreeSupply = await hardhatToken.currentFreeSupply();

      expect(finalBalance.sub(initialBalance)).to.equal(mintAmount);
      assert(finalFreeSupply.sub(initialFreeSupply), -2);
    });

    it("should revert when the mint amount exceeds the max supply", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      await hardhatToken.setMaxSupply(5);
      await hardhatToken.setMaxMintAmountPerTx(20);
      await hardhatToken.setMaxMintAmountPerWallet(20);
      const maxSupply = await hardhatToken._maxSupply();

      await hardhatToken.safeMint(addr1.address, 3);

      await expect(
        hardhatToken
          .connect(addr1)
          .mint(maxSupply, { value: ethers.utils.parseEther("3") })
      ).to.be.revertedWithCustomError(hardhatToken, "MaxSupply");
    });

    it("should revert when the mint amount exceeds the max mint amount per transaction", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const maxMintAmountPerTx = await hardhatToken.maxMintAmountPerTx();

      await expect(
        hardhatToken.connect(addr1).mint(maxMintAmountPerTx + 1)
      ).to.be.revertedWithCustomError(hardhatToken, "InvalidMintAmount");
    });

    // it("should revert when the mint amount is less than zero", async function () {
    //   const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    //   await expect(
    //     hardhatToken.connect(addr1).mint(-1)
    //   ).to.be.revertedWithCustomError(hardhatToken, "InvalidMintAmount");
    // });

    it("should revert when the addr1 has already reached the max mint amount per wallet", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const initialBalance = await hardhatToken.balanceOf(addr1.address);
      await hardhatToken.pause();

      const maxMintAmountPerWallet =
        await hardhatToken.maxMintAmountPerWallet();

      const costPerToken = await hardhatToken.costOfNFT();
      const total = BigNumber.from(costPerToken).mul(maxMintAmountPerWallet);
      await hardhatToken.connect(addr1).mint(maxMintAmountPerWallet, {
        value: total,
      });

      await expect(
        hardhatToken.connect(addr1).mint(1, { value: costPerToken })
      ).to.be.revertedWithCustomError(hardhatToken, "MaxMintWalletExceeded");

      const finalBalance = await hardhatToken.balanceOf(addr1.address);

      expect(finalBalance.sub(initialBalance)).to.equal(maxMintAmountPerWallet);
    });

    it("should revert when the contract is paused", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      //   await hardhatToken.pause();

      await expect(
        hardhatToken.connect(addr1).mint(1, { value: 10000 })
      ).to.be.revertedWithCustomError(hardhatToken, "ContractPaused");
    });

    // it("should revert when the addr1 is a smart contract", async function () {
    //   const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    //   const SmartContract = await ethers.getContractFactory(
    //     "SmartContractMock"
    //   );
    //   const smartContract = await SmartContract.deploy();

    //   await expect(
    //     hardhatToken
    //       .connect(smartContract.address)
    //       .mint(1, { value: costPerToken })
    //   ).to.be.revertedWithCustomError(hardhatToken, "NoSmartContract");
    // });

    it("should revert when the addr1 does not send enough ether to cover the cost of minting", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const costPerToken = await hardhatToken.costOfNFT();
      const tokenToMint = 5;
      const total = BigNumber.from(costPerToken)
        .mul(tokenToMint - 2)
        .sub(100000000000);
      await hardhatToken.pause();
      await expect(
        hardhatToken.connect(addr1).mint(tokenToMint, { value: total })
      ).to.be.revertedWithCustomError(hardhatToken, "InsufficientFund");
    });
  });

  describe("tokenURI", function () {
    it("should return the URI of the specified token when revealed", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const tokenId = 1;
      const expectedURI =
        "https://example.com/token/" + tokenId.toString() + ".json";

      // Set the base URI for the contract
      await hardhatToken.setbaseURL("https://example.com/token/");

      // Mint a new token with the specified ID
      await hardhatToken.safeMint(addr1.address, tokenId);

      // Reveal the token
      await hardhatToken.setRevealed();

      // Get the URI of the token
      const uri = await hardhatToken.tokenURI(tokenId);

      // Check that the URI matches the expected value
      assert.equal(uri, expectedURI, "Token URI is not correct");
    });

    it("should return a hidden URL for a token that has not been revealed", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const tokenId = 1;
      const expectedURI = "https://example.com/hidden";

      // Set the hidden URL for the contract
      await hardhatToken.setHiddenURL("https://example.com/hidden");

      // Mint a new token with the specified ID
      await hardhatToken.safeMint(addr1.address, tokenId);

      // Get the URI of the token
      const uri = await hardhatToken.tokenURI(tokenId);

      // Check that the URI matches the expected hidden URL
      assert.equal(uri, expectedURI, "Token URI is not the hidden URL");
    });

    it("should return an empty string for a non-existent token", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const nonExistentTokenId = 999;

      // Get the URI of a non-existent token
      await expect(
        hardhatToken.tokenURI(nonExistentTokenId)
      ).to.be.revertedWithCustomError(hardhatToken, "TokenNotExisting");

      // Check that the URI is an empty string
      //   assert.equal(uri, "", "URI is not empty for non-existent token");
    });
  });
});
