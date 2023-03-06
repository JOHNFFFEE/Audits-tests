const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("ERC20Staking hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const Token = await ethers.getContractFactory("ERC20Staking");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const erc20 = await ethers.getContractFactory("MockERC20");
    const erc20_address = await erc20.deploy();
    await erc20_address.deployed();

    const hardhatToken = await Token.deploy(erc20_address.address);

    await hardhatToken.deployed();

    const tokenAmount = 100000000000;

    await erc20_address.connect(addr1).mint(addr1.address, tokenAmount);
    await erc20_address
      .connect(addr1)
      .increaseAllowance(hardhatToken.address, tokenAmount);

    // Fixtures can return anything you consider useful for your tests
    return {
      Token,
      hardhatToken,
      owner,
      addr1,
      addr2,
      erc20_address,
    };
  }

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    it("constructor should be set up correctly", async () => {
      const { hardhatToken, erc20_address, owner } = await loadFixture(
        deployTokenFixture
      );
      // token address is correct
      const TokenAddress = await hardhatToken.rewardToken();
      assert.equal(TokenAddress, erc20_address.address);
      // default rewardsPerHour is correct
      const deployer = await hardhatToken.owner();
      assert.equal(deployer, owner.address);

      const compoundFreq = await hardhatToken.compoundFreq();
      assert.equal(compoundFreq.toString(), 14400);

      const minStake = await hardhatToken.minStake();
      assert.equal(minStake.toString(), 0);

      const pause = await hardhatToken.paused();
      assert.equal(pause, false);
    });

    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function () {
      // We use loadFixture to setup our environment, and then assert that
      // things went well
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);

      // `expect` receives a value and wraps it in an assertion object. These
      // objects have a lot of utility methods to assert values.

      // This test expects the owner variable stored in the hardhatToken to be
      // equal to our Signer's owner.
      expect(await hardhatToken.owner()).to.equal(owner.address);
    });
  });

  // Test the pause and unpause functions
  describe("pause/unpause", function () {
    it("should pause and unpause the hardhatToken when called by the owner", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Set up the test
      await hardhatToken.pause();

      // Check that the hardhatToken is paused
      expect(await hardhatToken.paused()).to.equal(true);

      // Unpause the hardhatToken
      await hardhatToken.unpause();

      // Check that the hardhatToken is unpaused
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

  //funding hardhatToken balance
  describe("funding", async () => {
    it("funding and Token balance of the farming hardhatToken is correct", async function () {
      const { hardhatToken, Token, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const amount = 1000;

      // Check the balance of the hardhatToken
      const balanceBefore = await hardhatToken.totalFunding();

      // Send some token to the hardhatToken
      await hardhatToken.connect(addr1).fundingContract(amount);

      // Check the balance of the hardhatToken after the withdrawal
      const balanceAfter = await hardhatToken.totalFunding();

      expect(balanceAfter.sub(amount)).to.equal(balanceBefore);
    });

    it("should revert if funding incorrect, amount should be more than 0", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const amount = 0;

      await expect(
        hardhatToken.connect(addr1).fundingContract(amount)
      ).to.be.revertedWith("fundingContract _amount should be more than 0");
    });
  });

  // Test the setRewards function
  describe("setRewards", function () {
    it("should insert new rewardsPerHour", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Set up the test
      const rewardsPerHour = await hardhatToken.rewardsPerHour();
      assert(rewardsPerHour, 10);

      const newReward = 5;
      await hardhatToken.setRewards(newReward);

      const rewardAfter = await hardhatToken.rewardsPerHour();

      // Check the results
      assert(rewardAfter, newReward);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const newReward = 5;

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setRewards(newReward)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Test the setsetCompFreq function
  describe("setCompFreq", function () {
    it("should insert new setCompFreq", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Set up the test
      const setCompFreq = await hardhatToken.compoundFreq();
      assert(setCompFreq, 14400);

      const newDuration = 90;
      await hardhatToken.setCompFreq(newDuration);

      // Check the results
      assert(await hardhatToken.compoundFreq(), newDuration);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const newDuration = 90;

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setCompFreq(newDuration)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setRewardQtyFaster", function () {
    it("should insert new RewardQtyFaster", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Set up the test
      const setRewardQtyFaster = await hardhatToken.amountToBeRewarded();
      assert(setRewardQtyFaster, 14400);

      const newamountToBeRewarded = 90;
      await hardhatToken.setRewardQtyFaster(newamountToBeRewarded);

      // Check the results
      assert(await hardhatToken.amountToBeRewarded(), newamountToBeRewarded);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const newamountToBeRewarded = 90;

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setRewardQtyFaster(newamountToBeRewarded)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Test the setsetCompFreq function
  describe("setMinStake", function () {
    it("should insert new setCompFreq", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Set up the test
      const setMinStake = await hardhatToken.minStake();
      assert(setMinStake, 0);

      const newDuration = 90;
      await hardhatToken.setMinStake(newDuration);

      // Check the results
      assert(await hardhatToken.minStake(), newDuration);
    });

    it("should revert if called by a non-owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      const newDuration = 90;

      // Call the function as a non-owner and expect it to revert
      await expect(
        hardhatToken.connect(addr1).setMinStake(newDuration)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Test the mint function and related functions
  describe("stake", function () {
    it("should allow staking if amount is greater than or equal to minStake", async function () {
      const { hardhatToken, addr1, erc20_address } = await loadFixture(
        deployTokenFixture
      );

      const AMOUNT_TO_STAKE = 10000;

      await hardhatToken.connect(addr1).stake(AMOUNT_TO_STAKE);
      const { _stake, _rewards } = await hardhatToken.getDepositInfo(
        addr1.address
      );
      assert.equal(_stake, AMOUNT_TO_STAKE);

      expect(await erc20_address.balanceOf(hardhatToken.address)).to.equal(
        AMOUNT_TO_STAKE
      );
    });

    it("should not allow staking if amount is less than minStake", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      await hardhatToken.setMinStake(5);

      await expect(hardhatToken.connect(addr1).stake(0)).to.be.revertedWith(
        "Amount smaller than minimimum deposit"
      );
    });

    it("should not allow staking if user doesn't have enough tokens", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const amountToStake = 500000000000;
      await expect(
        hardhatToken.connect(addr1).stake(amountToStake)
      ).to.be.revertedWith("Can't stake more than you own");
    });

    it("should update user's stake if they have already staked", async function () {
      const { hardhatToken, addr1, erc20_address } = await loadFixture(
        deployTokenFixture
      );
      const amountToStake = 500;

      await hardhatToken.connect(addr1).stake(amountToStake);

      const { _stake, _rewards } = await hardhatToken.getDepositInfo(
        addr1.address
      );
      assert.equal(_stake, amountToStake);

      expect(await erc20_address.balanceOf(hardhatToken.address)).to.equal(
        amountToStake
      );

      await hardhatToken.connect(addr1).stake(amountToStake);

      expect(await erc20_address.balanceOf(hardhatToken.address)).to.equal(
        2 * amountToStake
      );
    });
  });

  describe("stakeRewards", function () {
    it("should revert if the staker has no deposit", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Call the function with a staker who has no deposit
      await expect(hardhatToken.stakeRewards()).to.be.revertedWith(
        "You have no deposit"
      );
    });

    it("should revert if the staker tries to compound rewards too soon", async function () {
      // Set up a staker with a deposit and unclaimed rewards
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const amount = 10000;
      await hardhatToken.connect(addr1).stake(amount);

      // Call the function before the compound frequency has elapsed
      await expect(
        hardhatToken.connect(addr1).stakeRewards()
      ).to.be.revertedWith("Tried to compound rewards too soon");
    });

    it("should pass if the compound frequency has elapsed", async function () {
      // Set up a staker with a deposit and unclaimed rewards
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const amount = 100000;
      await hardhatToken.connect(addr1).stake(amount);

      await ethers.provider.send("evm_increaseTime", [14401]);
      await ethers.provider.send("evm_mine", []);

      const stakedBefore = await hardhatToken.getDepositInfo(addr1.address);

      // Call the function after the compound frequency has elapsed
      await hardhatToken.connect(addr1).stakeRewards();

      const stakedAfter = await hardhatToken.getDepositInfo(addr1.address);

      expect(stakedAfter._stake).to.be.equal(
        stakedBefore._stake.add(stakedBefore._rewards)
      );
    });
  });

  describe("claimRewards", function () {
    it("should transfer rewards to the user", async () => {
      const { hardhatToken, addr1, erc20_address, owner } = await loadFixture(
        deployTokenFixture
      );

      await erc20_address.mint(owner.address, 1000000000000000);
      await erc20_address.approve(hardhatToken.address, 1000000000000000);
      await hardhatToken.fundingContract(1000000000000000);

      // User1 stakes 100 tokens
      const amount = 50000;
      await hardhatToken.connect(addr1).stake(amount);

      // Wait for some time to pass
      await ethers.provider.send("evm_increaseTime", [14401]);
      await ethers.provider.send("evm_mine", []);

      // Calculate expected rewards
      const [stake, expectedRewards] = await hardhatToken.getDepositInfo(
        addr1.address
      );

      const balanceBefore = await erc20_address.balanceOf(addr1.address);

      // Claim rewards
      await hardhatToken.connect(addr1).claimRewards();

      // Check that the user received the expected rewards
      const userBalance = await erc20_address.balanceOf(addr1.address);
      expect(userBalance).to.equal(balanceBefore.add(expectedRewards));
    });

    it("only claim rewards - check stake amount", async () => {
      const { hardhatToken, addr1, erc20_address, owner } = await loadFixture(
        deployTokenFixture
      );

      await erc20_address.mint(owner.address, 1000000000000000);
      await erc20_address.approve(hardhatToken.address, 1000000000000000);
      await hardhatToken.fundingContract(1000000000000000);

      // User1 stakes 100 tokens
      const amount = 50000;
      await hardhatToken.connect(addr1).stake(amount);

      // Wait for some time to pass
      await ethers.provider.send("evm_increaseTime", [14401]);
      await ethers.provider.send("evm_mine", []);

      // Claim rewards
      await hardhatToken.connect(addr1).claimRewards();

      // Check that the user's unclaimed rewards were reset and time of last update was updated
      const [stake, _] = await hardhatToken.getDepositInfo(addr1.address);
      expect(stake).to.equal(amount);
    });

    it("should revert if the user has no rewards to claim", async () => {
      const { hardhatToken, addr1, erc20_address } = await loadFixture(
        deployTokenFixture
      );
      const amount = 10000;

      await hardhatToken.connect(addr1).stake(amount);

      // Try to claim rewards before any time has passed
      await expect(
        hardhatToken.connect(addr1).claimRewards()
      ).to.be.revertedWith("You have no rewards");
    });

    it("should revert if the user has no rewards to claim and didn't stake", async () => {
      const { hardhatToken, addr1, erc20_address } = await loadFixture(
        deployTokenFixture
      );

      // Try to claim rewards before any time has passed
      await expect(hardhatToken.claimRewards()).to.be.revertedWith(
        "You have no rewards"
      );
    });

    it("should decrease the total funding by the amount of rewards claimed", async () => {
      const { hardhatToken, addr1, erc20_address, owner } = await loadFixture(
        deployTokenFixture
      );

      await erc20_address.mint(owner.address, 1000000000000000);
      await erc20_address.approve(hardhatToken.address, 1000000000000000);
      await hardhatToken.fundingContract(1000000000000000);

      // User1 stakes 100 tokens
      const amount = 50000;
      await hardhatToken.connect(addr1).stake(amount);

      // Wait for some time to pass
      await ethers.provider.send("evm_increaseTime", [14401]);
      await ethers.provider.send("evm_mine", []);

      // Calculate expected rewards
      const [_, expectedRewards] = await hardhatToken.getDepositInfo(
        addr1.address
      );

      const totalFunding = await hardhatToken.totalFunding();
      // Claim rewards
      await hardhatToken.connect(addr1).claimRewards();

      const totalFundingAFTER = await hardhatToken.totalFunding();

      // // Check that the total funding was decreased by the amount of rewards claimed
      // const totalFunding = await hardhatToken.totalFunding();
      expect(totalFunding.sub(expectedRewards)).to.equal(totalFundingAFTER);
    });
  });

  describe("unstakeCertainAmount", function () {
    it("should fail to withdraw if not staked", async function () {
      const { hardhatToken, addr1, owner, erc20_address } = await loadFixture(
        deployTokenFixture
      );
      const depositAmount = 1000000;
      await hardhatToken.connect(addr1).stake(depositAmount);

      const withdrawAmount = 100;
      const balanceBefore = await erc20_address.balanceOf(owner.address);

      await expect(
        hardhatToken.unstakeCertainAmount(withdrawAmount)
      ).to.be.revertedWith("Can't withdraw more than you have");
    });

    it("should withdraw a certain amount of tokens", async function () {
      const { hardhatToken, addr1, erc20_address } = await loadFixture(
        deployTokenFixture
      );
      const depositAmount = 200000;
      await hardhatToken.connect(addr1).stake(depositAmount);

      const balanceBefore = await erc20_address.balanceOf(addr1.address);

      const withdrawAmount = 500;
      await hardhatToken.connect(addr1).unstakeCertainAmount(withdrawAmount);

      const balanceAfter = await erc20_address.balanceOf(addr1.address);

      expect(balanceBefore.add(withdrawAmount)).to.equal(balanceAfter);
    });

    it("should fail to withdraw more than staker has deposited", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const depositAmount = 1000000;
      await hardhatToken.connect(addr1).stake(depositAmount);

      const withdrawAmount = depositAmount + 1;
      await expect(
        hardhatToken.connect(addr1).unstakeCertainAmount(withdrawAmount)
      ).to.be.revertedWith("Can't withdraw more than you have");
    });

    // it("should fail to withdraw if there are not enough tokens in contract balance", async function () {
    //   const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    //   const depositAmount = 1000000;
    //   await hardhatToken.connect(addr1).stake(depositAmount);

    //   const withdrawAmount = depositAmount;
    //   await expect(
    //     hardhatToken.unstakeCertainAmount(withdrawAmount)
    //   ).to.be.revertedWith("Not enough tokens in contract balance");
    // });
  });

  describe("unstakeAll", function () {
    it("should withdraw all deposited and unclaimed rewards", async function () {
      const { hardhatToken, addr1, owner, erc20_address } = await loadFixture(
        deployTokenFixture
      );
      const depositAmount = 1000000;
      await hardhatToken.connect(addr1).stake(depositAmount);

      await erc20_address.mint(owner.address, 1000000);
      await erc20_address.approve(hardhatToken.address, 1000000);
      await hardhatToken.fundingContract(1000000);

      const [stake, rewards] = await hardhatToken.getDepositInfo(addr1.address);
      await hardhatToken.connect(addr1).unstakeAll();
    });

    it("should fail if staker has not deposited anything", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      await expect(hardhatToken.unstakeAll()).to.be.revertedWith(
        "You have no deposit"
      );
    });
  });

  describe("getDepositInfo", function () {
    it("should return the correct deposit info if user stake", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const compoundFreq = 14401;
      const depositAmount = 100000;
      await hardhatToken.connect(addr1).stake(depositAmount);
      await ethers.provider.send("evm_increaseTime", [compoundFreq]);
      await ethers.provider.send("evm_mine", []);
      const [stake, rewards] = await hardhatToken.getDepositInfo(addr1.address);

      expect(stake).to.equal(depositAmount);
      expect(rewards).to.be.equal(10);
    });
    it("should return the correct deposit info if user didn't stake", async function () {
      const { hardhatToken, addr2 } = await loadFixture(deployTokenFixture);

      const [stake, rewards] = await hardhatToken.getDepositInfo(addr2.address);

      expect(stake).to.equal(0);
      expect(rewards).to.equal(0);
    });
  });

  describe("compoundRewardsTimer", function () {
    it("should return 0 if user did not stake", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      const timer = await hardhatToken.compoundRewardsTimer(owner.address);
      expect(timer).to.equal(0);
    });
    it("should return 0 if compoundFreq seconds have elapsed since last update", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const compoundFreq = 14401;
      await hardhatToken.connect(addr1).stake(100);
      await ethers.provider.send("evm_increaseTime", [compoundFreq]);
      await ethers.provider.send("evm_mine", []);

      const timer = await hardhatToken.compoundRewardsTimer(addr1.address);
      expect(timer).to.equal(0);
    });

    it("should return the remaining seconds until the next compound", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      await hardhatToken.connect(addr1).stake(100);
      const timerBefore = await hardhatToken.compoundRewardsTimer(
        addr1.address
      );

      expect(timerBefore).to.be.greaterThan(0);

      // await ethers.provider.send("evm_increaseTime", [timerBefore.sub(1)]);
      // await ethers.provider.send("evm_mine", []);

      // const timerAfter = await hardhatToken.compoundRewardsTimer(
      //   staker.address
      // );
      // expect(timerAfter).to.equal(1);
    });
  });
});
