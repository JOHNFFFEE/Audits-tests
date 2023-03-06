const { expect } = require("chai");

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ERC20 hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const Token = await ethers.getContractFactory("SampleERC20");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const hardhatToken = await Token.deploy(10000 * 10e6);

    await hardhatToken.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { Token, hardhatToken, owner, addr1, addr2 };
  }

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define each
    // of your tests. It receives the test name, and a callback function.
    //
    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function () {
      // We use loadFixture to setup our environment, and then assert that
      // things went well
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);

      // `expect` receives a value and wraps it in an assertion object. These
      // objects have a lot of utility methods to assert values.

      // This test expects the owner variable stored in the contract to be
      // equal to our Signer's owner.
      expect(await hardhatToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      const ownerBalance = await hardhatToken.balanceOf(owner.address);
      expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
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

  //withdraw without checking the contract balance
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

  // Test the airdrop function
  describe("airdrop", function () {
    it("should mint the correct amount of tokens to each address provided when called by the owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const amount = 100;
      const recipients = [addr1.address, addr2.address];
      const expectedBalances = recipients.map(() => amount);

      // Call the function as the owner
      await hardhatToken.connect(owner).airdrop(recipients, amount);

      // Check the results
      const balances = await Promise.all(
        recipients.map((recipient) => hardhatToken.balanceOf(recipient))
      );
      expect(balances).to.deep.equal(expectedBalances);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const amount = 100;
      const recipients = [addr1.address, addr2.address];

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).airdrop(recipients, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Test the mint function and related functions
  describe("mint", function () {
    it("should mint tokens when called by the owner and the cap has not been exceeded", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const to = addr1.address;
      const amount = 1000000;

      // Call the function
      await hardhatToken.mint(to, amount);

      // Check the result
      const balance = await hardhatToken.balanceOf(to);
      expect(balance).to.equal(amount);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const to = addr1.address;
      const amount = 1000000;

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).mint(to, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if the cap has been exceeded", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      const to = addr1.address;
      const amount = 1000000000000;

      // Call the function and expect it to revert
      await expect(hardhatToken.mint(to, amount)).to.be.revertedWith(
        "ERC20Capped: cap exceeded"
      );
    });

    it("should return the correct number of decimals", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Call the function and check the result
      const decimals = await hardhatToken.decimals();
      expect(decimals).to.equal(6);
    });
  });
});
