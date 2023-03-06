const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
// const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ERC721i hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const Token = await ethers.getContractFactory("SampleERC721i");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const price = ethers.utils.parseEther("2.0");

    const hardhatToken = await Token.deploy(
      price,
      10000, //max suuply
      "ipfs://aappppp/",
      5, //trx
      10, //wallet
      "ipfs://aaaaaa/"
    );

    await hardhatToken.deployed();

    // Fixtures can return anything you consider useful for your tests
    return {
      Token,
      hardhatToken,
      owner,
      addr1,
      addr2,
    };
  }

  describe("Initial State", () => {
    it("Collection name be SampleNFT", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const name = await hardhatToken.name();
      const expectedValue = "SampleNFT";
      assert.equal(name, expectedValue);
    });

    it("Collection symbol should be SNFT", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const symbol = await hardhatToken.symbol();
      const expectedValue = "SNFT";
      assert.equal(symbol, expectedValue);
    });

    it("Collection Size should be 10000", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const maxSupply = await hardhatToken.maxSupply();
      const expectedValue = 10000;
      assert.equal(maxSupply.toString(), expectedValue);
    });

    it("Public Mint Price should be 2 ETH", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.price();
      const expectedValue = ethers.utils.parseEther("2.0");
      assert.equal(currentValue.toString(), expectedValue);
    });

    it("Public Max Mint Amount per trx should be 5", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.maxMintAmountPerTx();
      const expectedValue = 5;
      assert.equal(currentValue.toString(), expectedValue);
    });

    it("Public Max Mint Amount per wallet should be 10", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.maxMintAmountPerWallet();
      const expectedValue = 10;
      assert.equal(currentValue.toString(), expectedValue);
    });

    it("Unrevealed URI should be ipfs://aaaaaa/", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.HiddenURL();
      const expectedValue = "ipfs://aaaaaa/";
      assert.equal(currentValue, expectedValue);
    });

    it("Base Uri should be ipfs://aappppp/", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.baseURL();
      const expectedValue = "ipfs://aappppp/";
      assert.equal(currentValue, expectedValue);
    });

    it("Reveal should be false", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.revealed();
      const expectedValue = false;
      assert.equal(currentValue, expectedValue);
    });

    it("Pause should be false", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.paused();
      const expectedValue = false;
      assert.equal(currentValue, expectedValue);
    });
  });

  describe("premint", function () {
    it("should revert if already preminted", async function () {
      const { hardhatToken, proof_addr1, addr1 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.preMint();

      await expect(hardhatToken.preMint()).to.be.revertedWithCustomError(
        hardhatToken,
        "AlreadyPreminted"
      );
    });

    it("premint all maxSupply", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);

      const maxSupply = 10000;
      await hardhatToken.preMint();

      expect(await hardhatToken.balanceOf(owner.address)).to.be.equal(
        maxSupply
      );
    });
    it("should revert if caller is not the owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(hardhatToken.connect(addr1).preMint()).to.be.revertedWith(
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
      const price = await hardhatToken.price();
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

  describe("mint()", function () {
    it("should revert when the contract is paused", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const price = await hardhatToken.price();
      await hardhatToken.preMint();
      // Pause the contract, then call the mint function and expect it to revert
      await hardhatToken.pause();
      await expect(
        hardhatToken.mint(1, { value: price })
      ).to.be.revertedWithCustomError(hardhatToken, "ContractPaused");
    });

    it("should mint the correct number of tokens", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture); // Call the mint function with a valid mint amount and expect it to mint the correct number of tokens
      await hardhatToken.preMint();
      const price = await hardhatToken.price();
      const total = BigNumber.from(price).mul(3);
      const balanceBefore = await hardhatToken.balanceOf(addr1.address);
      await hardhatToken.connect(addr1).mint(3, { value: total });
      const balanceAfter = await hardhatToken.balanceOf(addr1.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(3);
    });

    // it("should revert when the mint amount is negative", async function () {
    //   const { hardhatToken } = await loadFixture(deployTokenFixture);
    //   // Call the mint function with a negative mint amount and expect it to revert

    //   await expect(hardhatToken.mint(-1)).to.be.revertedWithPanic(
    //     PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW
    //   );
    //   //   hardhatToken,
    //   //   "InvalidMintAmount"
    //   // );
    // });

    it("should revert when the mint amount is greater than the maximum per transaction", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Call the mint function with a mint amount that exceeds the maximum per transaction and expect it to revert
      await hardhatToken.preMint();
      await expect(hardhatToken.mint(11)).to.be.revertedWithCustomError(
        hardhatToken,
        "InvalidMintAmount"
      );
    });

    it("should revert when the current supply plus the mint amount exceeds the maximum supply", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Call the mint function with a mint amount that exceeds the remaining supply and expect it to revert
      const maxSupply = 10000;
      await hardhatToken.setMaxMintAmountPerTx(1000000000);
      await hardhatToken.setMaxMintAmountPerWallet(1000000000);
      await hardhatToken.preMint();
      const price = await hardhatToken.price();
      const total = BigNumber.from(price).mul(11).toString();
      await expect(
        hardhatToken.mint(maxSupply + 1, { value: total })
      ).to.be.revertedWithCustomError(hardhatToken, "MaxSupply");
    });
    it("should revert when the price is insufficient", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Call the mint function with an insufficient amount of ether and expect it to revert
      const price = await hardhatToken.price();
      const total = BigNumber.from(price).sub(1).toString();
      await expect(
        hardhatToken.mint(1, { value: total })
      ).to.be.revertedWithCustomError(hardhatToken, "InsufficientFund");
    });

    it("should revert when the mint amount exceeds the maximum per wallet", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.preMint();
      // Mint the maximum amount per wallet to addr1, then try to mint one more token and expect it to revert
      const maxMintAmountPerWallet =
        await hardhatToken.maxMintAmountPerWallet();
      const price = await hardhatToken.price();
      const total = BigNumber.from(price)
        .mul(maxMintAmountPerWallet)
        .toString();
      // await hardhatToken.setwhitelistFeature();
      await hardhatToken.setMaxMintAmountPerTx(20);
      await hardhatToken.connect(addr1).mint(maxMintAmountPerWallet, {
        value: total,
      });
      await expect(
        hardhatToken.connect(addr1).mint(1, { value: price })
      ).to.be.revertedWithCustomError(hardhatToken, "MaxMintWalletExceeded");
    });
  });

  describe("airdrop()", function () {
    it("should revert when the current supply plus the airdrop amount exceeds the maximum supply", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.preMint();
      await hardhatToken.setCostPrice("1");
      // await hardhatToken.setMaxMintAmountPerTx(10000);
      // await hardhatToken.setMaxMintAmountPerWallet(10000);
      const price = await hardhatToken.price();
      // Mint some tokens to the owner to bring the current supply close to the maximum supply
      const maxSupply = await hardhatToken.maxSupply();
      const currentSupply = await hardhatToken.currentSupply();
      const remainingSupply = maxSupply.sub(currentSupply);
      const total = BigNumber.from(price).mul(remainingSupply).toString();
      const ownerBalanceBefore = await hardhatToken.balanceOf(owner.address);
      await hardhatToken.setMaxMintAmountPerTx(maxSupply);
      await hardhatToken.setMaxMintAmountPerWallet(maxSupply);

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
      await hardhatToken.pause();
      await expect(
        hardhatToken.airdrop([addr1.address, addr2.address], 1)
      ).to.be.revertedWithCustomError(hardhatToken, "ContractPaused");
    });

    it("should mint the correct number of tokens to each receiver in the array", async function () {
      const { hardhatToken, addr2, addr1 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.preMint();
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
  describe("tokenURI", function () {
    it("should return the URI of the specified token when revealed", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const tokenId = 1;
      const expectedURI =
        "https://example.com/token/" + tokenId.toString() + ".json";

      // Set the base URI for the contract
      await hardhatToken.setbaseURL("https://example.com/token/");
      await hardhatToken.setCostPrice(0);
      // Mint a new token with the specified ID
      await hardhatToken.preMint();
      await hardhatToken.connect(addr1).mint(tokenId);

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

      await hardhatToken.setCostPrice(0);
      // Mint a new token with the specified ID
      await hardhatToken.preMint();
      await hardhatToken
        .connect(addr1)
        .mint(tokenId, { value: ethers.utils.parseEther("2.0") });

      // Get the URI of the token
      const uri = await hardhatToken.tokenURI(tokenId);

      // Check that the URI matches the expected hidden URL
      assert.equal(uri, expectedURI, "Token URI is not the hidden URL");
    });

    it("should return an empty string for a non-existent token", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const nonExistentTokenId = 100000;

      // Get the URI of a non-existent token
      await expect(
        hardhatToken.tokenURI(nonExistentTokenId)
      ).to.be.revertedWithCustomError(hardhatToken, "TokenNotExisting");

      // Check that the URI is an empty string
      //   assert.equal(uri, "", "URI is not empty for non-existent token");
    });
  });

  // Define a test for the batchTransfer function
  describe("batchTransfer", function () {
    it("should transfer the correct amounts of tokens to the specified address", async function () {
      const { hardhatToken, addr1, owner, addr2 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.preMint();

      // Call the batchTransfer function
      await hardhatToken.batchTransfer(addr1.address, [1, 2, 3]);
      await hardhatToken.batchTransfer(addr2.address, [4]);

      // Check that the tokens were transferred correctly
      expect(await hardhatToken.ownerOf(1)).to.equal(addr1.address);
      expect(await hardhatToken.ownerOf(2)).to.equal(addr1.address);
      expect(await hardhatToken.ownerOf(3)).to.equal(addr1.address);
      expect(await hardhatToken.ownerOf(4)).to.equal(addr2.address);
    });

    it("should transfer the correct amounts of tokens to the specified address minted", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.preMint();
      await hardhatToken
        .connect(addr1)
        .mint(2, { value: ethers.utils.parseEther("4") });

      // Call the batchTransfer function
      await hardhatToken.connect(addr1).batchTransfer(addr2.address, [1, 2]);

      // Check that the tokens were transferred correctly
      expect(await hardhatToken.ownerOf(1)).to.equal(addr2.address);
      expect(await hardhatToken.ownerOf(2)).to.equal(addr2.address);
    });
  });

  describe("batchTransferFrom", function () {
    it("should transfer the correct amounts of tokens from one address to another", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const tokenIds = [1, 2];
      await hardhatToken.preMint();
      await hardhatToken
        .connect(addr1)
        .mint(3, { value: ethers.utils.parseEther("6") });
      // Define the parameters for the batch transfer from
      const from = addr1.address;
      const to = addr2.address;

      //   // Approve the transfer from the owner to the user
      //   await hardhatToken.setApprovalForAll(user.address, true, {
      //     from: owner.address,
      //   });

      // Call the batchTransferFrom function as the user
      await hardhatToken.connect(addr1).batchTransferFrom(from, to, tokenIds);

      // Check that the tokens were transferred correctly
      expect(await hardhatToken.ownerOf(1)).to.equal(addr2.address);
      expect(await hardhatToken.ownerOf(2)).to.equal(addr2.address);
      expect(await hardhatToken.ownerOf(3)).to.equal(addr1.address);
    });
  });

  // Define a test for the currentSupply function
  describe("currentSupply", function () {
    it("should return the correct token ID counter value", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await hardhatToken.preMint();
      await hardhatToken
        .connect(addr1)
        .mint(3, { value: ethers.utils.parseEther("6") });

      // Check that the current supply is correct
      expect(await hardhatToken.currentSupply()).to.equal(3);

      // Mint some more tokens

      await hardhatToken.airdrop([addr1.address, addr2.address], 4);

      // Check that the current supply is correct
      expect(await hardhatToken.currentSupply()).to.equal(11);
    });
  });
});
