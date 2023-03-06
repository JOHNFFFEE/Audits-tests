const { expect, assert } = require("chai");

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const GOLD = 0;
const SILVER = 1;
const BRONZE = 2;
const DIAMOND = 3;
const TEST_TOKEN = 4;

const GOLD_AMOUNT = 5;
const SILVER_AMOUNT = 10;
const BRONZE_AMOUNT = 20;
const DIAMOND_AMOUNT = 1;
const TEST_TOKEN_AMOUNT = 1;

const maxPerWallet = 5;
const maxTransaction = 3;
const price = ethers.utils.parseEther("0.005");

const name = "CollectionName";
const collection = "CollectionSymble";

describe("ERC1155", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const Token = await ethers.getContractFactory("SampleERC1155");
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const hardhatToken = await Token.deploy(name, collection);

    await hardhatToken.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { Token, hardhatToken, owner, addr1, addr2, addr3, addr4 };
  }

  describe("Deploy", async () => {
    it("token balance deployment", async () => {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      expect(await hardhatToken.balanceOf(owner.address, GOLD)).to.equal(
        GOLD_AMOUNT
      );
      expect(await hardhatToken.balanceOf(owner.address, SILVER)).to.equal(0);
      expect(await hardhatToken.balanceOf(owner.address, BRONZE)).to.equal(0);
      expect(await hardhatToken.balanceOf(owner.address, DIAMOND)).to.equal(0);
    });

    it("Name Symbol", async () => {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      expect(await hardhatToken.name()).to.equal(name);
      expect(await hardhatToken.symbol()).to.equal(collection);
      expect(await hardhatToken.owner()).to.equal(owner.address);
    });
  });

  describe("Mint", async () => {
    it("new minting without money", async () => {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      await expect(
        hardhatToken.mint(TEST_TOKEN, TEST_TOKEN_AMOUNT, {
          value: ethers.utils.parseEther("0"),
        })
      ).to.be.revertedWith("Not enough money");
    });

    it("new minting", async () => {
      const { hardhatToken, addr2 } = await loadFixture(deployTokenFixture);

      await hardhatToken.connect(addr2).mint(GOLD, 2, {
        value: ethers.utils.parseEther("0.01"),
      });
      expect(await hardhatToken.balanceOf(addr2.address, GOLD)).to.equal(2);

      await hardhatToken.connect(addr2).mint(BRONZE, 2, {
        value: ethers.utils.parseEther("0.01"),
      });
      expect(await hardhatToken.balanceOf(addr2.address, BRONZE)).to.equal(2);
    });

    it("maxTransaction", async () => {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(
        hardhatToken.connect(addr2).mint(TEST_TOKEN, maxTransaction + 1, {
          value: ethers.utils.parseEther("0.020"),
        })
      ).to.be.revertedWith("Exceeded limit per trx");
    });

    it("maxPerWallet", async () => {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      hardhatToken.connect(addr2).mint(TEST_TOKEN, maxTransaction, {
        value: ethers.utils.parseEther("0.015"),
      });

      await expect(
        hardhatToken.connect(addr2).mint(TEST_TOKEN, maxTransaction, {
          value: ethers.utils.parseEther("0.015"),
        })
      ).to.be.revertedWith("Exceeded limit per wallet");
    });
  });

  // Test the burnForMint function
  describe("burnForMint", function () {
    it("should burn the specified NFTs and mint the specified NFTs when called by the owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      // Set up the test
      const from = owner.address;
      const burnIds = [1, 2, 3];
      const burnAmounts = [1, 1, 1];
      const mintIds = [4, 5, 6];
      const mintAmounts = [1, 1, 1];

      //to lazy to enter fees into the below mint functions
      await hardhatToken.setCostPrice(0);

      // Mint some initial NFTs to burn
      await hardhatToken.mint(1, 1);
      await hardhatToken.mint(2, 1);
      await hardhatToken.mint(3, 1);

      // Call the burnForMint function and check the results
      await hardhatToken.burnForMint(
        from,
        burnIds,
        burnAmounts,
        mintIds,
        mintAmounts
      );
      const balance1 = await hardhatToken.balanceOf(from, 1);
      const balance2 = await hardhatToken.balanceOf(from, 2);
      const balance3 = await hardhatToken.balanceOf(from, 3);
      const balance4 = await hardhatToken.balanceOf(from, 4);
      const balance5 = await hardhatToken.balanceOf(from, 5);
      const balance6 = await hardhatToken.balanceOf(from, 6);

      expect(balance1).to.equal(0);
      expect(balance2).to.equal(0);
      expect(balance3).to.equal(0);
      expect(balance4).to.equal(1);
      expect(balance5).to.equal(1);
      expect(balance6).to.equal(1);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      // Set up the test
      const from = owner.address;
      const burnIds = [1, 2, 3];
      const burnAmounts = [1, 1, 1];
      const mintIds = [4, 5, 6];
      const mintAmounts = [1, 1, 1];

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken
          .connect(addr1)
          .burnForMint(from, burnIds, burnAmounts, mintIds, mintAmounts)
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

    it("should revert if there are no funds to withdraw", async function () {
      const { hardhatToken, Token, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(
        hardhatToken.connect(owner).withdraw({ value: 0 })
      ).to.be.revertedWith("Not enough balance");
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

  // Test the setURI function
  describe("setURI", function () {
    it("should set the URI when called by the owner after the collection has been revealed", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      // Set up the test
      const newURI = "https://new.uri";
      await hardhatToken.reveal();
      await hardhatToken.connect(owner).setURI(newURI);

      // Check the result
      const uri = await hardhatToken.uri(1);
      expect(uri).to.equal(newURI);
    });

    it("should revert if the collection has not been revealed", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      // Set up the test
      const newURI = "https://new.uri";

      // Call the function and expect it to revert
      await expect(
        hardhatToken.connect(owner).setURI(newURI)
      ).to.be.revertedWith("Collection not revealed");
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      // Set up the test
      const newURI = "https://new.uri";
      await hardhatToken.reveal();

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setURI(newURI)
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
      const maxPerWallet = await hardhatToken.maxPerWallet();
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
      const maxTransaction = await hardhatToken.maxTransaction();
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

  // Test the pause and unpause functions
  describe("pause/unpause", function () {
    it("should pause and unpause the contract when called by the owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      await hardhatToken.pause();

      // Check that the contract is paused
      expect(await hardhatToken.paused()).to.equal(true);

      // Unpause the contract
      await hardhatToken.unpause();

      // Check that the contract is unpaused
      expect(await hardhatToken.paused()).to.equal(false);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the functions as a non-owner and expect them to revert
      await expect(hardhatToken.connect(addr1).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await expect(hardhatToken.connect(addr1).unpause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  // Test the reveal function
  describe("reveal", function () {
    it("should set revealed to true when called by the owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function
      await hardhatToken.reveal();

      // Check that the revealed flag is true
      expect(await hardhatToken.revealed()).to.equal(true);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function as a non-owner and expect it to revert
      await expect(hardhatToken.connect(addr1).reveal()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
});
