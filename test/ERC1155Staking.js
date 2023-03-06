const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("ERC1155Staking hardhatToken", function () {
  // describe.only("ERC1155Staking hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.

    const [owner, addr1, addr2] = await ethers.getSigners();

    const erc20 = await ethers.getContractFactory("MockERC20");
    const erc20_address = await erc20.deploy();
    await erc20_address.deployed();

    const erc1155 = await ethers.getContractFactory("MyERC1155");
    const erc1155_address = await erc1155.deploy();
    await erc1155_address.deployed();

    const rewardPerHour = 100;

    const Token = await ethers.getContractFactory("ERC1155Staking");
    const hardhatToken = await Token.deploy(
      erc1155_address.address,
      erc20_address.address,
      rewardPerHour
    );

    await hardhatToken.deployed();

    await erc1155_address.mint(owner.address, 1, 3);
    await erc1155_address.connect(addr1).mint(addr1.address, 2, 5);
    await erc1155_address.setApprovalForAll(hardhatToken.address, true);
    await erc1155_address
      .connect(addr1)
      .setApprovalForAll(hardhatToken.address, true);

    const three_hundreds_SECS = 300;
    const stackingTime = (await time.latest()) + three_hundreds_SECS;

    // await ethers.provider.send("evm_increaseTime", [14401]);
    // await ethers.provider.send("evm_mine", []);

    // Fixtures can return anything you consider useful for your tests
    return {
      Token,
      hardhatToken,
      owner,
      addr1,
      addr2,
      erc1155_address,
      erc20_address,
      three_hundreds_SECS,
      stackingTime,
    };
  }

  describe("Initial State", () => {
    it("Should initialize properly with correct configuration", async () => {
      const { hardhatToken, erc1155_address, erc20_address, owner } =
        await loadFixture(deployTokenFixture);

      const id = 1;

      expect(await erc1155_address.balanceOf(owner.address, id)).to.equal(3);
      expect(await hardhatToken.rewardsToken()).to.equal(erc20_address.address);
      expect(await hardhatToken.nftCollection()).to.equal(
        erc1155_address.address
      );
      expect(await hardhatToken.owner()).to.equal(owner.address);
      expect(await hardhatToken.rewardsPerHour()).to.equal(100);
      expect(await hardhatToken.stakingTime()).to.equal(300);
    });
  });

  // Test the stake function
  describe("stake()", function () {
    it("should allow users to stake ERC1155 tokens", async function () {
      const { hardhatToken, erc1155_address, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      // Check that addr1's stake was recorded correctly
      const { token, qty } = await hardhatToken.getStakedIdsAndAmounts(
        addr1.address
      );

      expect(token[0]).to.equal(tokenId);
      expect(qty[0]).to.equal(amount);
    });

    it("should update the staker's amountStaked and timeOfLastUpdate", async function () {
      const { hardhatToken, erc1155_address, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      const tokenId = 2;
      const amount = 3;

      await hardhatToken.connect(addr1).stake(tokenId, amount);
      const { timeOfLastUpdate, unclaimedRewards, globalAmount } =
        await hardhatToken.stakers(addr1.address);
      expect(unclaimedRewards).to.equal(0); // 1 from before, 1 new
      expect(timeOfLastUpdate).to.be.closeTo(Math.floor(Date.now() / 1000), 4); // within 4 seconds of current timestamp
      expect(globalAmount).to.equal(3);
    });

    it("should transfer the staked NFT tokens to the hardhatToken", async function () {
      const { hardhatToken, erc1155_address, owner } = await loadFixture(
        deployTokenFixture
      );

      const tokenId = 1;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.stake(tokenId, amount);

      expect(await erc1155_address.balanceOf(owner.address, tokenId)).to.equal(
        0
      );
      expect(
        await erc1155_address.balanceOf(hardhatToken.address, tokenId)
      ).to.equal(amount);
    });

    // it("should emit a Staked event", async function () {
    //   const tx = await hardhatToken.connect(addr1).stake([3]);
    //   const { args } = await tx.wait();
    //   expect(args.staker).to.equal(addr1.address);
    //   expect(args.tokenIds).to.have.lengthOf(1);
    //   expect(args.tokenIds[0]).to.equal(3);
    // });

    it("should revert if the staker staking tokens he doesn't own", async function () {
      const { hardhatToken, addr2 } = await loadFixture(deployTokenFixture);

      const tokenId = 1;
      const amount = 3;

      await expect(
        hardhatToken.connect(addr2).stake(tokenId, amount)
      ).to.be.revertedWith("you dont have enough balance");
    });
  });

  describe("withdraw()", function () {
    it("should revert if the owner didnt send any erc20 to the contract", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);

      await expect(hardhatToken.claimRewards()).to.be.revertedWith(
        "You have no rewards to claim"
      );
    });

    it("should revert if the user has no tokens staked", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const tokenId = 2;
      const amount = 3;

      await expect(
        hardhatToken.connect(addr1).withdraw(tokenId, amount)
      ).to.be.revertedWith("You have no tokens staked");
    });

    it("should withdraw the correct ERC1155 tokens and update the staker info", async function () {
      const { hardhatToken, erc1155_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      await erc20_address.mint(hardhatToken.address, 10000000);

      await hardhatToken.connect(addr1).withdraw(tokenId, amount);

      const { timeOfLastUpdate, unclaimedRewards, globalAmount } =
        await hardhatToken.stakers(addr1.address);
      expect(unclaimedRewards).to.equal(2); // 1 from before, 1 new
      expect(timeOfLastUpdate).to.be.closeTo(Math.floor(Date.now() / 1000), 5); // within 4 seconds of current timestamp
      expect(globalAmount).to.equal(0);
    });

    it("Staker 1 tries to withdraw with invalid token IDs", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      // Staker 1 tries to withdraw with invalid token IDs
      await expect(
        hardhatToken.connect(addr1).withdraw(tokenId + 1, amount)
      ).to.be.revertedWith("Token is not staked by user");
    });
    it("Staker 1 tries to withdraw with invalid amount token IDs", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      // Staker 1 tries to withdraw with invalid token IDs
      await expect(
        hardhatToken.connect(addr1).withdraw(tokenId, amount + 1)
      ).to.be.revertedWith("Insufficient staked balance");
    });

    it("should revert if attempting to withdraw another staker's token", async function () {
      const { hardhatToken, erc1155_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.stake(tokenId - 1, amount - 2);
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      await expect(
        hardhatToken.connect(addr1).withdraw(tokenId - 1, amount - 2)
      ).to.be.revertedWith("Token is not staked by user");
    });

    it("should revert if attempting to withdraw another staker's token and not approved but not his", async function () {
      const { hardhatToken, erc1155_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      const tokenId = 2;
      const amount = 3;

      await expect(hardhatToken.stake(tokenId, amount)).to.be.revertedWith(
        "you dont have enough balance"
      );
    });

    it("should revert if attempting to withdraw unstaked token", async function () {
      const { hardhatToken, erc1155_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.stake(tokenId - 1, amount - 2);

      // Attempt to withdraw unstaked token
      await expect(
        hardhatToken.withdraw(tokenId, amount - 2)
      ).to.be.revertedWith("Token is not staked by user");
    });

    it("Staker tries to withdraw their tokens", async function () {
      const { hardhatToken, erc1155_address, addr1, owner } = await loadFixture(
        deployTokenFixture
      );

      const tokenId = 2;
      const amount = 5;

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      // Staker 1 withdraws their tokens
      await expect(
        hardhatToken.connect(addr1).withdraw(tokenId, amount)
      ).to.emit(hardhatToken, "Withdraw");
      // .withArgs(addr1.address, [3, 4, 5], await getCurrentTimestamp());

      // Check that the staker's information has been updated correctly
      expect(await erc1155_address.balanceOf(addr1.address, tokenId)).to.equal(
        amount
      );
    });
  });

  describe("claimRewards", function () {
    it("should claim rewards for a staker with unclaimed rewards", async function () {
      const { hardhatToken, erc20_address, addr1, owner } = await loadFixture(
        deployTokenFixture
      );

      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 3;

      await erc20_address.mint(hardhatToken.address, 100000);

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount - 1);

      await ethers.provider.send("evm_increaseTime", [601]);
      await ethers.provider.send("evm_mine", []);
      // await time.increase(6000);

      // Calculate rewards and check that they can be claimed
      const rewardsBefore = await erc20_address.balanceOf(addr1.address);
      // Staker stakes tokens and waits for 2 hours (assume the rewards rate is 1 reward per hour)

      await hardhatToken.connect(addr1).stake(tokenId, 1);

      await hardhatToken.connect(addr1).withdraw(tokenId, amount);

      //check unclaimed rewards
      const { timeOfLastUpdate, unclaimedRewards, globalAmount } =
        await hardhatToken.stakers(addr1.address);

      console.log(unclaimedRewards, globalAmount);

      const tx = await hardhatToken.connect(addr1).claimRewards();

      const rewardsAfter = await erc20_address.balanceOf(addr1.address);

      assert.equal(
        rewardsAfter.sub(rewardsBefore).toString(),
        unclaimedRewards
      );
      assert.equal(globalAmount.toString(), 0);

      // Check that the staker's unclaimed rewards and time of last update have been reset to 0
      //check unclaimed rewards
      // const { timeOfLastUpdate, unclaimedRewards, globalAmount } =
      //   await hardhatToken.userStakeInfo(owner.address);
      // assert.equal([], 0, "Unclaimed rewards were not reset to 0");

      // assert.equal([], 0, "Unclaimed rewards were not reset to 0");
      // assert.equal(
      //   timeOfLastUpdate.toString(),
      //   "0",
      //   "Time of last update was not reset to 0"
      // );

      // Check that the ClaimReward event was emitted
      // expectEvent(tx, "ClaimReward", {
      //   user: owner,
      //   amount: totalRewards.toString(),
      //   timestamp: (await time.latest()).toString(),
      // });
    });

    it("should revert if staker has no rewards to claim", async function () {
      const { hardhatToken, addr2 } = await loadFixture(deployTokenFixture);
      await expect(
        hardhatToken.connect(addr2).claimRewards()
      ).to.be.revertedWith("You have no rewards to claim");
    });
  });

  describe("setRewardsPerHour", function () {
    it("should update rewardsPerHour", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const rewardsPerHour = 1000;
      await hardhatToken.setRewardsPerHour(rewardsPerHour);
      const updatedRewardsPerHour = await hardhatToken.rewardsPerHour();
      expect(updatedRewardsPerHour).to.equal(rewardsPerHour);
    });

    // it("should update rewardsPerHour and calculate rewards for all stakers", async function () {
    //   const {
    //     hardhatToken,
    //     erc20_address,
    //     stackingTime,
    //     erc1155_address,
    //     owner,
    //     addr1,
    //   } = await loadFixture(deployTokenFixture);
    //   const rewardsPerHour = 1000;
    //   await hardhatToken.setRewardsPerHour(rewardsPerHour);
    //   // Calculate expected rewards for addr1 and user2

    //   await hardhatToken.stake([0]);
    //   // Update rewardsPerHour

    //   await erc20_address.mint(hardhatToken.address, 1000);

    //   const staker1Rewards = await hardhatToken.userStakeInfo(owner.address);
    //   const rewards = staker1Rewards[1];

    //   expect(staker2Rewards).to.equal(rewards);
    // });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const rewardsPerHour = 100;
      await expect(
        hardhatToken.connect(addr1).setRewardsPerHour(rewardsPerHour)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("userStakeInfo", function () {
    it("should return staker info", async function () {
      const { hardhatToken, erc20_address, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 1;

      await erc20_address.mint(hardhatToken.address, 100000);

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);
      // Get staker info
      const { timeOfLastUpdate, unclaimedRewards, globalAmount } =
        await hardhatToken.stakers(addr1.address);
      expect(unclaimedRewards).to.equal(0); // 1 from before, 1 new
      expect(timeOfLastUpdate).to.be.closeTo(Math.floor(Date.now() / 1000), 5); // within 4 seconds of current timestamp
      expect(globalAmount).to.equal(1);
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

  describe("setStakingTime", function () {
    it("should allow the owner to update the staking time", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const newPeriod = 604800; // 1 week in seconds

      await hardhatToken.setStakingTime(newPeriod);
      const updatedPeriod = await hardhatToken.stakingTime();

      assert.equal(updatedPeriod, newPeriod, "Staking period was not updated");
    });

    it("should not allow non-owners to update the staking time", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const newPeriod = 604800; // 1 week in seconds

      await expect(
        hardhatToken.connect(addr1).setStakingTime(newPeriod)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Start test block
  describe("getStakedIdsAndAmounts", () => {
    it("should return the staked token ids and amounts for a staker", async () => {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 3;

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);

      const [tokens, amounts] = await hardhatToken.getStakedIdsAndAmounts(
        addr1.address
      );
      expect(tokens.length).to.equal(1);
      expect(amounts.length).to.equal(1);
      expect(tokens[0]).to.equal(2);
      expect(amounts[0]).to.equal(3);
    });
    it("should return the staked token ids and amounts for a staker- multiple staking", async () => {
      const { hardhatToken, addr1, erc1155_address } = await loadFixture(
        deployTokenFixture
      );

      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 5;

      await erc1155_address.mint(addr1.address, 1, 3);

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);
      await hardhatToken.connect(addr1).stake(tokenId - 1, amount - 2);

      const [tokens, amounts] = await hardhatToken.getStakedIdsAndAmounts(
        addr1.address
      );
      expect(tokens.length).to.equal(2);
      expect(amounts.length).to.equal(2);
      expect(tokens[0]).to.equal(2);
      expect(tokens[1]).to.equal(1);
      expect(amounts[0]).to.equal(5);
      expect(amounts[1]).to.equal(3);
    });
    it("should remove tokenIds from array after withdraw", async () => {
      const { hardhatToken, addr1, erc1155_address } = await loadFixture(
        deployTokenFixture
      );

      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 5;

      await erc1155_address.mint(addr1.address, 1, 3);

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);
      await hardhatToken.connect(addr1).withdraw(tokenId, amount);

      const [tokens, amounts] = await hardhatToken.getStakedIdsAndAmounts(
        addr1.address
      );
      expect(tokens.length).to.equal(0);
      expect(amounts.length).to.equal(0);
    });
    it("should update amount if same tokenIds", async () => {
      const { hardhatToken, addr1, erc1155_address } = await loadFixture(
        deployTokenFixture
      );

      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 3;

      await erc1155_address.mint(addr1.address, 1, 3);

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);
      await hardhatToken.connect(addr1).stake(tokenId, 2);

      const [tokens, amounts] = await hardhatToken.getStakedIdsAndAmounts(
        addr1.address
      );
      expect(tokens.length).to.equal(1);
      expect(amounts.length).to.equal(1);
      expect(tokens[0]).to.equal(2);
      expect(amounts[0]).to.equal(5);
    });
    it("should update amount if remove tokenIds", async () => {
      const { hardhatToken, addr1, erc1155_address } = await loadFixture(
        deployTokenFixture
      );

      // Transfer ERC1155 token to addr1
      const tokenId = 2;
      const amount = 3;

      await erc1155_address.mint(addr1.address, 1, 3);

      // User1 stakes ERC1155 token
      await hardhatToken.connect(addr1).stake(tokenId, amount);
      await hardhatToken.connect(addr1).stake(tokenId - 1, 2);

      await hardhatToken.connect(addr1).withdraw(tokenId, amount);

      const [tokens, amounts] = await hardhatToken.getStakedIdsAndAmounts(
        addr1.address
      );
      expect(tokens.length).to.equal(1);
      expect(amounts.length).to.equal(1);
      expect(tokens[0]).to.equal(1);
      expect(amounts[0]).to.equal(2);
    });
  });
});
