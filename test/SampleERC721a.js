const { expect, assert } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { ZERO_ADDRESS } = "0x0000000000000000000000000000000000000000";
const {
  getMerkleTree,
  getMerkleRoot,
  getMerkleProof,
} = require("../utils/merkletree");
const { BigNumber } = require("ethers");

describe("Token721a hardhatToken Tests", () => {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const Token = await ethers.getContractFactory("SampleERC721a");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const price = ethers.utils.parseEther("2.0");
    // await lottery
    //   .connect(player1)
    //   .enterLottery({ value: ethers.utils.parseEther("2.0") });

    const hardhatToken = await Token.deploy(
      price,
      10000, //max suuply
      "ipfs://aappppp/",
      5, //trx
      10, //wallet
      "ipfs://aaaaaa/",
      ethers.utils.keccak256("0x1234")
    );

    await hardhatToken.deployed();

    const tree = getMerkleTree([owner.address, addr1.address]);
    const root = getMerkleRoot(tree);
    await hardhatToken.setHashRoot(root);
    const proof_addr1 = await getMerkleProof(tree, addr1.address);
    const proof_owner = await getMerkleProof(tree, owner.address);

    // Fixtures can return anything you consider useful for your tests
    return {
      Token,
      hardhatToken,
      owner,
      addr1,
      addr2,
      proof_addr1,
      root,
      proof_owner,
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
      const maxSupply = await hardhatToken._maxSupply();
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

    it("Whitelist open (whitelistFeature)", async () => {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.whitelistFeature();
      const expectedValue = false;
      assert.equal(currentValue, expectedValue);
    });

    it("Whitelist hashroot ", async () => {
      const { hardhatToken, root } = await loadFixture(deployTokenFixture);
      const currentValue = await hardhatToken.hashRoot();
      assert.equal(currentValue.toString(), root);
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
  describe("mintCompliance", function () {
    it("should allow minting when all conditions are met", async function () {
      const { hardhatToken, owner, addr1, proof_addr1, root } =
        await loadFixture(deployTokenFixture);
      // Set up the test
      await hardhatToken.setCostPrice(100);
      // await hardhatToken.setMaxMintAmountPerTx(10);
      // await hardhatToken.setMaxMintAmountPerWallet(20);
      // await hardhatToken.setMaxSupply(1000);
      await hardhatToken.setwhitelistFeature();
      const maxMintAmount = 5;
      const value = 500;

      // const tree = getMerkleTree([owner.address, addr1.address]);
      // const root = getMerkleRoot(tree);
      // await hardhatToken.setHashRoot(root);
      // const proof = getMerkleProof(tree, addr1.address);

      const currentValue = await hardhatToken.hashRoot();
      assert.equal(currentValue.toString(), root);

      // Call the function with the mintCompliance modifier and expect it to succeed
      // await expect(
      //   hardhatToken
      //     .connect(addr1)
      //     .whitelistMint(maxMintAmount, proof_addr1, { value: value })
      // ).to.emit(hardhatToken, "Transfer");

      await hardhatToken
        .connect(addr1)
        .whitelistMint(maxMintAmount, proof_addr1, { value: value });

      // Check the result
      expect(await hardhatToken.balanceOf(addr1.address)).to.equal(
        maxMintAmount
      );
    });

    // it("should revert when called by a smart contract", async function () {
    //   const { hardhatToken, owner, addr1 } = await loadFixture(
    //     deployTokenFixture
    //   );
    //   // Call the function from a smart contract and expect it to revert
    //   const DummyContract = await ethers.getContractFactory("SampleERC721");
    //   const dummyContract = await DummyContract.deploy(
    //     1,
    //     10000, //max suuply
    //     "ipfs://ddd/",
    //     5, //trx
    //     10, //wallet
    //     "ipfs://eee/",
    //     ethers.utils.keccak256("0x1234")
    //   );
    //   await dummyContract.deployed();

    //   const tree = getMerkleTree([dummyContract.address, addr1.address]);
    //   const root = getMerkleRoot(tree);
    //   await hardhatToken.setHashRoot(root);
    //   const proof = getMerkleProof(tree, dummyContract.address);
    //   await hardhatToken.setCostPrice(100);

    //   await expect(
    //     hardhatToken.connect(addr1).whitelistMint(5, proof, { value: 500 })
    //   ).to.be.revertedWithCustomError(hardhatToken, "NoSmartContract");
    // });

    // it("should revert when the mint amount is less than zero", async function () {
    //   const { hardhatToken, owner, addr1 } = await loadFixture(
    //     deployTokenFixture
    //   );
    //   // Call the function with a negative mint amount and expect it to revert

    //   const tree = getMerkleTree([owner.address, addr1.address]);
    //   const root = getMerkleRoot(tree);
    //   await hardhatToken.setHashRoot(root);
    //   const proof = getMerkleProof(tree, addr1.address);

    //   await expect(
    //     hardhatToken.connect(addr1).whitelistMint(-1, proof)
    //   ).to.be.revertedWithPanic(PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW);
    // });

    it("should revert when the mint amount exceeds the maximum per transaction", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a mint amount that exceeds the maximum per transaction and expect it to revert
      await hardhatToken.setMaxMintAmountPerWallet(15);
      await hardhatToken.setMaxMintAmountPerTx(10);
      const tree = getMerkleTree([owner.address, addr1.address]);
      const root = getMerkleRoot(tree);
      await hardhatToken.setHashRoot(root);
      const proof = getMerkleProof(tree, addr1.address);

      await expect(
        hardhatToken.connect(addr1).whitelistMint(11, proof)
      ).to.be.revertedWithCustomError(hardhatToken, "InvalidMintAmount");
    });

    it("should revert when the current supply plus the mint amount exceeds the maximum supply", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a mint amount that would exceed the maximum supply and expect it to revert
      await hardhatToken.setMaxSupply(100);
      await hardhatToken.setMaxMintAmountPerTx(52);
      await hardhatToken.setMaxMintAmountPerWallet(120);
      await hardhatToken.setCostPrice(0);
      await hardhatToken.mint(50);

      const tree = getMerkleTree([owner.address, addr1.address]);
      const root = getMerkleRoot(tree);
      await hardhatToken.setHashRoot(root);
      const proof = getMerkleProof(tree, addr1.address);

      await expect(
        hardhatToken.connect(addr1).whitelistMint(51, proof)
      ).to.be.revertedWithCustomError(hardhatToken, "MaxSupply");
    });

    it("should revert when the sent value is less than the price", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a value that is less than the price and expect it to revert
      await hardhatToken.setCostPrice(100);

      const tree = getMerkleTree([owner.address, addr1.address]);
      const root = getMerkleRoot(tree);
      await hardhatToken.setHashRoot(root);
      const proof = getMerkleProof(tree, addr1.address);

      await expect(
        hardhatToken.connect(addr1).whitelistMint(5, proof, {
          value: 50,
        })
      ).to.be.revertedWithCustomError(hardhatToken, "InsufficientFund");
    });

    it("should revert when the contract is paused", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function when the contract is paused and expect it to revert
      const tree = getMerkleTree([owner.address, addr1.address]);
      const root = getMerkleRoot(tree);
      await hardhatToken.setHashRoot(root);
      const price = await hardhatToken.price();
      const proof = getMerkleProof(tree, addr1.address);
      const total = BigNumber.from(price).mul(5);
      await hardhatToken.pause();
      await expect(
        hardhatToken.connect(addr1).whitelistMint(5, proof, { value: total })
      ).to.be.revertedWithCustomError(hardhatToken, "ContractPaused");
    });

    it("should revert when the mint amount plus the current balance exceeds the maximum per wallet", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a mint amount that exceeds the maximum per wallet and expect it to revert
      await hardhatToken.setCostPrice(0);
      await hardhatToken.setMaxMintAmountPerWallet(10);
      await hardhatToken.setMaxMintAmountPerTx(8);
      await hardhatToken.connect(addr1).mint(5);
      await hardhatToken.setwhitelistFeature();
      const tree = getMerkleTree([owner.address, addr1.address]);
      const root = getMerkleRoot(tree);
      await hardhatToken.setHashRoot(root);
      const proof = getMerkleProof(tree, addr1.address);

      await expect(
        hardhatToken.connect(addr1).whitelistMint(6, proof)
      ).to.be.revertedWithCustomError(hardhatToken, "MaxMintWalletExceeded");
    });
  });

  describe("whitelistMint", function () {
    it("should allow minting when the user is whitelisted and the proof is valid", async function () {
      const { hardhatToken, proof_addr1, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      await hardhatToken.setwhitelistFeature();
      await hardhatToken.setCostPrice(100);
      await hardhatToken.setMaxMintAmountPerTx(10);
      await hardhatToken.setMaxMintAmountPerWallet(20);
      await hardhatToken.setMaxSupply(1000);
      await hardhatToken.setRevealed();
      const maxMintAmount = 5;
      const value = 500;

      // Call the function with a valid proof and expect it to succeed
      await expect(
        hardhatToken
          .connect(addr1)
          .whitelistMint(maxMintAmount, proof_addr1, { value: value })
      )
        .to.emit(hardhatToken, "Transfer")
        .withArgs(
          "0x0000000000000000000000000000000000000000",
          addr1.address,
          maxMintAmount
        );

      const currentValue = await hardhatToken.balanceOf(addr1.address);
      // Check the result
      assert.equal(currentValue.toString(), maxMintAmount);
    });

    it("should revert when the whitelist feature is not enabled", async function () {
      const { hardhatToken, owner, addr1, proof_addr1 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.setCostPrice(0);
      // Call the function when the whitelist feature is not enabled and expect it to revert
      await expect(
        hardhatToken.connect(addr1).whitelistMint(5, proof_addr1)
      ).to.be.revertedWithCustomError(hardhatToken, "NotWhitelistMintEnabled");
    });

    it("should revert when the user is not whitelisted", async function () {
      const { hardhatToken, owner, proof_addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a user that is not whitelisted and expect it to revert
      await hardhatToken.setwhitelistFeature();
      await hardhatToken.setCostPrice(0);

      await expect(
        hardhatToken.connect(owner).whitelistMint(5, proof_addr1)
      ).to.be.revertedWithCustomError(hardhatToken, "InvalidProof");
    });

    it("should revert when the proof is invalid", async function () {
      // Call the function with an invalid proof and expect it to revert
      const { hardhatToken, proof_owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      await hardhatToken.setwhitelistFeature();

      const price = await hardhatToken.price();
      const total = BigNumber.from(price).mul(5).toString();

      await expect(
        hardhatToken
          .connect(addr1)
          .whitelistMint(5, proof_owner, { value: total })
      ).to.be.revertedWithCustomError(hardhatToken, "InvalidProof");
    });

    // it("should revert when the mint amount is negative", async function () {
    //   const { hardhatToken, owner, addr1 } = await loadFixture(
    //     deployTokenFixture
    //   );
    //   // Call the function with a negative mint amount and expect it to revert
    //   await hardhatToken.setwhitelistFeature();
    //   await hardhatToken.setCostPrice(0);

    //   const tree = getMerkleTree([owner.address, addr1.address]);
    //   const root = getMerkleRoot(tree);
    //   await hardhatToken.setHashRoot(root);
    //   const proof = getMerkleProof(tree, addr1.address);

    //   await expect(
    //     hardhatToken.connect(addr1).whitelistMint(-1, proof)
    //   ).to.be.revertedWith("value out-of-bounds");
    // });

    it("should revert when the mint amount is greater than the maximum per transaction", async function () {
      const { hardhatToken, proof_addr1, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a mint amount that exceeds the maximum per transaction and expect it to revert
      await hardhatToken.setwhitelistFeature();
      await hardhatToken.setMaxMintAmountPerTx(10);
      await hardhatToken.setMaxMintAmountPerWallet(25);
      await hardhatToken.setCostPrice(0);

      await expect(
        hardhatToken.connect(addr1).whitelistMint(11, proof_addr1)
      ).to.be.revertedWithCustomError(hardhatToken, "InvalidMintAmount");
    });

    it("should revert when the current supply plus the mint amount exceeds the maximum supply", async function () {
      const { hardhatToken, proof_addr1, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a mint amount that exceeds the remaining supply and expect it to revert
      await hardhatToken.setwhitelistFeature();
      await hardhatToken.setMaxSupply(10);
      await hardhatToken.setMaxMintAmountPerTx(20);
      await hardhatToken.setMaxMintAmountPerWallet(20);
      await hardhatToken.setCostPrice(1);

      await expect(
        hardhatToken
          .connect(addr1)
          .whitelistMint(11, proof_addr1, { value: 11 })
      ).to.be.revertedWithCustomError(hardhatToken, "MaxSupply");
    });

    it("should revert when the price is insufficient", async function () {
      const { hardhatToken, proof_addr1, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a price that is less than the required amount and expect it to revert
      await hardhatToken.setwhitelistFeature();
      await hardhatToken.setCostPrice(100);

      await expect(
        hardhatToken.connect(addr1).whitelistMint(1, proof_addr1, { value: 50 })
      ).to.be.revertedWithCustomError(hardhatToken, "InsufficientFund");
    });
  });

  describe("setwhitelistFeature()", function () {
    it("should toggle whitelist feature", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function and expect the whitelist feature to be toggled
      await hardhatToken.setwhitelistFeature();
      expect(await hardhatToken.whitelistFeature()).to.equal(true);
      await hardhatToken.setwhitelistFeature();
      expect(await hardhatToken.whitelistFeature()).to.equal(false);
    });

    it("should revert if called by non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a non-owner address and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setwhitelistFeature()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setHashRoot()", function () {
    it("should set the hash root", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function and expect the hash root to be set
      const hashRoot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["uint256"], [123])
      );
      await hardhatToken.setHashRoot(hashRoot);
      expect(await hardhatToken.hashRoot()).to.equal(hashRoot);
    });

    it("should revert if called by non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a non-owner address and expect it to revert
      const hashRoot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["uint256"], [123])
      );
      await expect(
        hardhatToken.connect(addr1).setHashRoot(hashRoot)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("checkHashRoot()", function () {
    it("should return the hash root", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function and expect the hash root to be returned
      const hashRoot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["uint256"], [123])
      );
      await hardhatToken.setHashRoot(hashRoot);
      expect(await hardhatToken.checkHashRoot()).to.equal(hashRoot);
    });

    it("should revert if called by non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function with a non-owner address and expect it to revert
      const hashRoot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["uint256"], [123])
      );
      await expect(
        hardhatToken.connect(addr1).checkHashRoot()
      ).to.be.revertedWith("Ownable: caller is not the owner");
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

  // describe("setHiddenURL", function () {
  //   it("should set the HiddenURL", async function () {
  //     const { hardhatToken, owner, addr1 } = await loadFixture(
  //       deployTokenFixture
  //     );
  //     const HiddenURL = "";
  //     // Call the function to set the HiddenURL and verify that it has been updated
  //     await hardhatToken.setHiddenURL("https://example.com/hidden");
  //     expect(await hardhatToken.HiddenURL()).to.equal(
  //       "https://example.com/hidden"
  //     );
  //   });
  // });

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

  describe("mint()", function () {
    it("should revert when the contract is paused", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const price = await hardhatToken.price();
      // Pause the contract, then call the mint function and expect it to revert
      await hardhatToken.pause();
      await expect(
        hardhatToken.mint(1, { value: price })
      ).to.be.revertedWithCustomError(hardhatToken, "ContractPaused");
    });

    it("should revert when the whitelist feature is not enabled", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const price = await hardhatToken.price();
      // Enable the whitelist feature, then call the mint function and expect it to revert
      await hardhatToken.setwhitelistFeature();
      await expect(
        hardhatToken.mint(1, { value: price })
      ).to.be.revertedWithCustomError(hardhatToken, "NotWhitelistMintEnabled");
    });

    it("should mint the correct number of tokens", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture); // Call the mint function with a valid mint amount and expect it to mint the correct number of tokens

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
      await hardhatToken.setMaxMintAmountPerWallet(20);
      await expect(hardhatToken.mint(11)).to.be.revertedWithCustomError(
        hardhatToken,
        "InvalidMintAmount"
      );
    });

    it("should revert when the current supply plus the mint amount exceeds the maximum supply", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Call the mint function with a mint amount that exceeds the remaining supply and expect it to revert
      await hardhatToken.setMaxSupply(10);
      await hardhatToken.setMaxMintAmountPerTx(20);
      await hardhatToken.setMaxMintAmountPerWallet(20);

      const price = await hardhatToken.price();
      const total = BigNumber.from(price).mul(11).toString();
      await expect(
        hardhatToken.mint(11, { value: total })
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

      // Mint the maximum amount per wallet to addr1, then try to mint one more token and expect it to revert
      const maxMintAmountPerWallet =
        await hardhatToken.maxMintAmountPerWallet();
      const price = await hardhatToken.price();
      const total = BigNumber.from(price)
        .mul(maxMintAmountPerWallet)
        .toString();
      // await hardhatToken.setwhitelistFeature();
      await hardhatToken.setMaxMintAmountPerTx(20);
      await hardhatToken.mint(maxMintAmountPerWallet, {
        value: total,
      });
      await expect(
        hardhatToken.mint(1, { value: price })
      ).to.be.revertedWithCustomError(hardhatToken, "MaxMintWalletExceeded");
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
      const price = await hardhatToken.price();
      // Mint some tokens to the owner to bring the current supply close to the maximum supply
      const maxSupply = await hardhatToken._maxSupply();
      const currentSupply = await hardhatToken.totalSupply();
      const remainingSupply = maxSupply.sub(currentSupply);
      const total = BigNumber.from(price).mul(remainingSupply).toString();
      const ownerBalanceBefore = await hardhatToken.balanceOf(owner.address);
      await hardhatToken.setMaxMintAmountPerTx(remainingSupply);
      await hardhatToken.setMaxMintAmountPerWallet(remainingSupply);

      await hardhatToken.mint(remainingSupply, {
        value: total,
      });
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
      await hardhatToken.pause();
      await expect(
        hardhatToken.airdrop([addr1.address, addr2.address], 1)
      ).to.be.revertedWithCustomError(hardhatToken, "ContractPaused");
    });

    it("should mint the correct number of tokens to each receiver in the array", async function () {
      const { hardhatToken, addr2, addr1 } = await loadFixture(
        deployTokenFixture
      );
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

    it("should revert if caller is not the owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const receiverArray = [addr1.address, addr2.address];
      const airdropAmount = 1;
      await expect(
        hardhatToken.connect(addr1).airdrop(receiverArray, airdropAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("checkHashRoot", function () {
    it("only allows the owner to call the function", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(
        hardhatToken.connect(addr1).checkHashRoot()
      ).to.be.rejectedWith("Ownable: caller is not the owner");
    });

    it("returns the correct hash root", async function () {
      const { hardhatToken, root } = await loadFixture(deployTokenFixture);
      const hashRoot = await hardhatToken.checkHashRoot();
      expect(root).to.equal(hashRoot);
    });
  });

  // Use the describe function to group related tests
  describe("safeMint", function () {
    it("should mint the specified quantity of tokens to the specified address", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const to = addr1.address;
      const quantity = 10;

      await hardhatToken.safeMint(to, quantity);
      assert((await hardhatToken.balanceOf(to)) == quantity);
    });
    it("should revert if caller is not the owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      const quantity = 10;
      const to = addr2.address;

      await expect(
        hardhatToken.connect(addr1).safeMint(to, quantity)
      ).to.be.revertedWith("Ownable: caller is not the owner");
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
      await hardhatToken.mint(tokenId);

      // Reveal the token
      await hardhatToken.setRevealed();

      // Get the URI of the token
      const uri = await hardhatToken.tokenURI(tokenId);

      // Check that the URI matches the expected value
      assert.equal(uri, expectedURI, "Token URI is not correct");
    });

    // it("should return a hidden URL for a token that has not been revealed", async function () {
    //   const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    //   const tokenId = 1;
    //   const expectedURI = "https://example.com/hidden";

    //   // Set the hidden URL for the contract
    //   await hardhatToken.setHiddenURL("https://example.com/hidden");
    //   await hardhatToken.setCostPrice(0);
    //   // Mint a new token with the specified ID
    //   await hardhatToken.mint(tokenId);

    //   // Get the URI of the token
    //   const uri = await hardhatToken.tokenURI(tokenId);

    //   // Check that the URI matches the expected hidden URL
    //   assert.equal(uri, expectedURI, "Token URI is not the hidden URL");
    // });

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
