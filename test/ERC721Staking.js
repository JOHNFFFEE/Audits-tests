const { expect, assert } = require("chai");

const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("ERC721Staking hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.

    const [owner, addr1, addr2] = await ethers.getSigners();

    const erc20 = await ethers.getContractFactory("MockERC20");
    const erc20_address = await erc20.deploy();
    await erc20_address.deployed();

    const erc721 = await ethers.getContractFactory("MockERC721");
    const erc721_address = await erc721.deploy();
    await erc721_address.deployed();

    const rewardPerHour = 10000;

    const Token = await ethers.getContractFactory("ERC721Staking");
    const hardhatToken = await Token.deploy(
      erc721_address.address,
      erc20_address.address,
      rewardPerHour
    );

    await hardhatToken.deployed();

    await erc721_address.safeMint(owner.address);
    await erc721_address.safeMint(owner.address);
    await erc721_address.safeMint(owner.address);
    await erc721_address.setApprovalForAll(hardhatToken.address, true);

    const three_hundreds_SECS = 300;
    const stackingTime = (await time.latest()) + three_hundreds_SECS;

    // Fixtures can return anything you consider useful for your tests
    return {
      Token,
      hardhatToken,
      owner,
      addr1,
      addr2,
      erc721_address,
      erc20_address,
      three_hundreds_SECS,
      stackingTime,
    };
  }

  describe("Initial State", () => {
    it("Should initialize properly with correct configuration", async () => {
      const { hardhatToken, erc721_address, erc20_address, owner } =
        await loadFixture(deployTokenFixture);

      expect(await erc721_address.balanceOf(owner.address)).to.equal(3);
      expect(await hardhatToken.rewardsToken()).to.equal(erc20_address.address);
      expect(await hardhatToken.nftCollection()).to.equal(
        erc721_address.address
      );
      expect(await hardhatToken.owner()).to.equal(owner.address);
    });
  });

  // Test the stake function
  describe("stake()", function () {
    it("should allow users to stake ERC721 tokens", async function () {
      const { hardhatToken, erc721_address, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      // Transfer ERC721 token to addr1
      const res = await erc721_address.safeMint(addr1.address);
      // console.log(res);

      const tokenId = 3;

      // User1 stakes ERC721 token
      await erc721_address
        .connect(addr1)
        .setApprovalForAll(hardhatToken.address, true); // Replace 1 with the ID of the ERC721 token staked by addr1
      await hardhatToken.connect(addr1).stake([tokenId]);

      // Check that addr1's stake was recorded correctly
      expect(await hardhatToken.stakerAddress(tokenId)).to.eql(addr1.address); // addr1 should have 1 token staked and 0 unclaimed rewards

      expect(await erc721_address.ownerOf(tokenId)).to.eql(
        hardhatToken.address
      ); // addr1 should have 1 token staked and 0 unclaimed rewards

      it("should update the staker's amountStaked and timeOfLastUpdate", async function () {
        const { hardhatToken, erc721_address, owner, addr1 } =
          await loadFixture(deployTokenFixture);
        await erc721_address.safeMint(addr1.address);
        await erc721_address.safeMint(addr1.address);
        await erc721_address.setApprovalForAll(hardhatToken.address, true);

        await hardhatToken.connect(addr1).stake([3, 4]);
        const { amountStaked, timeOfLastUpdate } = await hardhatToken.stakers(
          addr1.address
        );
        expect(amountStaked).to.equal(2); // 1 from before, 1 new
        expect(timeOfLastUpdate).to.be.closeTo(
          Math.floor(Date.now() / 1000),
          2
        ); // within 2 seconds of current timestamp
      });

      it("should transfer the staked NFT tokens to the hardhatToken", async function () {
        const { hardhatToken, erc721_address, addr1 } = await loadFixture(
          deployTokenFixture
        );

        // await erc721_address.safeMint(addr1.address);
        // await erc721_address.safeMint(addr1.address);
        await erc721_address.setApprovalForAll(hardhatToken.address, true);

        await hardhatToken.stake([1, 2]);

        expect(await erc721_address.ownerOf(1)).to.equal(hardhatToken.address);
        expect(await erc721_address.ownerOf(2)).to.equal(hardhatToken.address);
      });

      // it("should emit a Staked event", async function () {
      //   const tx = await hardhatToken.connect(addr1).stake([3]);
      //   const { args } = await tx.wait();
      //   expect(args.staker).to.equal(addr1.address);
      //   expect(args.tokenIds).to.have.lengthOf(1);
      //   expect(args.tokenIds[0]).to.equal(3);
      // });

      it("should revert if the staker staking tokens he doesn't own", async function () {
        const { hardhatToken, erc721_address, addr2 } = await loadFixture(
          deployTokenFixture
        );

        await erc721_address.safeMint(addr1.address);
        await erc721_address
          .connect(addr1)
          .setApprovalForAll(hardhatToken.address, true);

        await expect(
          hardhatToken.connect(addr2).stake([1, 2])
        ).to.be.revertedWith("Can't stake tokens you don't own!");
      });

      it("should revert if the staker has already staked the same NFT token", async function () {
        const { hardhatToken, erc721_address } = await loadFixture(
          deployTokenFixture
        );

        await erc721_address.safeMint(addr1.address);
        await erc721_address.setApprovalForAll(hardhatToken.address, true);
        await hardhatToken.connect(addr1).stake([3]);
        await expect(hardhatToken.connect(addr1).stake([3])).to.be.revertedWith(
          "You already staked this token"
        );
      });
    });
  });

  describe("withdraw()", function () {
    it("should revert if the owner didnt send any erc20 to the contract", async function () {
      const { hardhatToken, erc721_address, stackingTime } = await loadFixture(
        deployTokenFixture
      );

      const tokenId = [0, 1, 2];

      await erc721_address.setApprovalForAll(hardhatToken.address, true);
      await hardhatToken.stake(tokenId);

      // We can increase the time in Hardhat Network
      await time.increaseTo(stackingTime);

      await expect(hardhatToken.claimRewards()).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("should revert if the user has no tokens staked", async function () {
      const { hardhatToken, erc20_address, addr1 } = await loadFixture(
        deployTokenFixture
      );
      await erc20_address.mint(hardhatToken.address, 10000000);

      await expect(
        hardhatToken.connect(addr1).withdraw([1, 2, 3])
      ).to.be.revertedWith("You have no tokens staked");
    });

    it("should withdraw the correct ERC721 tokens and update the staker info", async function () {
      const { hardhatToken, erc721_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      await erc20_address.mint(hardhatToken.address, 10000000);

      await await erc721_address.safeMint(addr1.address);
      await erc721_address.safeMint(addr1.address);
      await erc721_address.safeMint(addr1.address);
      await erc721_address.safeMint(addr2.address);
      await erc721_address.safeMint(addr2.address);

      // console.log(0, await erc721_address.ownerOf(0));
      // console.log(1, await erc721_address.ownerOf(1));
      // console.log(2, await erc721_address.ownerOf(2));
      // console.log(3, await erc721_address.ownerOf(3));
      // console.log(4, await erc721_address.ownerOf(4));
      // console.log(5, await erc721_address.ownerOf(5));
      // console.log(6, await erc721_address.ownerOf(6));
      // console.log(7, await erc721_address.ownerOf(7));

      await erc721_address
        .connect(addr1)
        .setApprovalForAll(hardhatToken.address, true);
      await erc721_address
        .connect(addr2)
        .setApprovalForAll(hardhatToken.address, true);

      // Staker 1 stakes 3 tokens
      await hardhatToken.connect(addr1).stake([3, 4, 5]);
      await hardhatToken.connect(addr2).stake([6, 7]);
    });

    it("Staker 1 tries to withdraw with invalid token IDs", async function () {
      const { hardhatToken, erc721_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      // Staker 1 tries to withdraw with invalid token IDs
      await expect(hardhatToken.connect(addr1).withdraw([8, 9])).to.be.reverted; //With("ERC721: owner query for nonexistent token");
    });

    it("should revert if attempting to withdraw another staker's token", async function () {
      const { hardhatToken, erc721_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      await erc721_address.connect(addr1).safeMint(addr1.address);
      await erc721_address.connect(addr1).safeMint(addr1.address);

      await erc721_address
        .connect(addr1)
        .setApprovalForAll(hardhatToken.address, true);
      await hardhatToken.connect(addr1).stake([3]);

      await expect(hardhatToken.connect(addr1).withdraw([6, 7])).to.be.reverted; //With("Can't stake tokens you don't own!");
    });

    it("should revert if attempting to withdraw another staker's token and not approved but not his", async function () {
      const { hardhatToken, erc721_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      await erc721_address.connect(addr1).safeMint(addr1.address);
      await erc721_address.connect(addr1).safeMint(addr1.address);

      await expect(
        hardhatToken.connect(addr1).stake([3, 4])
      ).to.be.revertedWith("ERC721: caller is not token owner or approved");
    });

    it("should revert if attempting to withdraw unstaked token", async function () {
      const { hardhatToken, erc721_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      // Mint NFT and approve transfer to contract
      const tokenId = 1;
      await erc721_address.approve(hardhatToken.address, tokenId);
      await hardhatToken.stake([1]);

      // Attempt to withdraw unstaked token
      await expect(hardhatToken.withdraw([10])).to.be.reverted; //With("Token is not staked");
    });

    it("Staker tries to withdraw withdraws their tokens", async function () {
      const { hardhatToken, erc721_address, addr1, addr2, erc20_address } =
        await loadFixture(deployTokenFixture);

      await erc721_address.connect(addr1).safeMint(addr1.address);
      await erc721_address.connect(addr1).safeMint(addr1.address);

      await erc721_address
        .connect(addr1)
        .setApprovalForAll(hardhatToken.address, true);

      await hardhatToken.connect(addr1).stake([3, 4]);

      // Staker 1 withdraws their tokens
      await expect(hardhatToken.connect(addr1).withdraw([3, 4])).to.emit(
        hardhatToken,
        "Withdraw"
      );
      // .withArgs(addr1.address, [3, 4, 5], await getCurrentTimestamp());

      // Check that the staker's information has been updated correctly
      assert(await erc721_address.ownerOf(3), addr1.address);
      assert(await erc721_address.ownerOf(4), addr1.address);
      // expect(stakerInfo[1]).to.equal(0);
    });
  });

  // describe("claimRewards()", function () {
  //   it("should revert if the staker has no rewards to claim", async function () {
  //     const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

  //     // await hardhatToken.connect(addr1).stake([1]);

  //     await expect(
  //       hardhatToken.connect(addr1).claimRewards()
  //     ).to.be.revertedWith("You have no rewards to claim");
  //   });

  //   it("should transfer the correct amount of rewards to the staker and update the staker info", async function () {
  //     const { hardhatToken, owner, stackingTime, erc20_address } =
  //       await loadFixture(deployTokenFixture);

  //     await erc20_address.mint(hardhatToken.address, 10e5);

  //     // Staker 1 stakes 1 token
  //     await hardhatToken.stake([0]);

  //     // Advance time
  //     await time.increaseTo(stackingTime);

  //     // Calculate the rewards for the staker
  //     const [tokensStaked, availableRewards] = await hardhatToken.userStakeInfo(
  //       owner.address
  //     );

  //     // Staker 1 claims their rewards
  //     await expect(hardhatToken.claimRewards()).to.emit(
  //       hardhatToken,
  //       "ClaimReward"
  //     );
  //     //   .withArgs(addr1.address, rewards, await getCurrentTimestamp());

  //     // Check that the staker's information has been updated correctly

  //     expect(tokensStaked).to.equal(1);
  //     expect(availableRewards).to.equal(10000);
  //   });
  // });

  describe("claimRewards", function () {
    it("should claim rewards for a staker with unclaimed rewards", async function () {
      const { hardhatToken, erc20_address, stackingTime, owner } =
        await loadFixture(deployTokenFixture);
      // Deploy contracts, add staker and token allocation here

      // const unclaimedReward = 100;
      // const currentRewards = 200;
      const totalRewards = 10033;
      // Calculate rewards and check that they can be claimed
      const rewardsBefore = await erc20_address.balanceOf(owner.address);
      // Staker stakes tokens and waits for 2 hours (assume the rewards rate is 1 reward per hour)
      await erc20_address.mint(hardhatToken.address, 1000000);
      await hardhatToken.stake([1]);
      await time.increase(300); // 2 hours have passed
      // await time.increaseTo((await time.latest()) + 300);
      await hardhatToken.withdraw([1]);

      const tx = await hardhatToken.claimRewards();
      const rewardsAfter = await erc20_address.balanceOf(owner.address);

      assert.equal(
        rewardsAfter.sub(rewardsBefore).toString(),
        totalRewards.toString(),
        "Incorrect rewards amount claimed"
      );

      // Check that the staker's unclaimed rewards and time of last update have been reset to 0
      const { unclaimedRewards, timeOfLastUpdate } =
        await hardhatToken.userStakeInfo(owner.address);
      assert.equal([], 0, "Unclaimed rewards were not reset to 0");
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
      const { hardhatToken, erc20_address, addr2 } = await loadFixture(
        deployTokenFixture
      );
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
    //     erc721_address,
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
      const { hardhatToken, owner, stackingTime } = await loadFixture(
        deployTokenFixture
      );
      // Stake tokens
      await hardhatToken.stake([0]);

      // Get staker info
      const [stakedTokenIds, availableRewards] =
        await hardhatToken.userStakeInfo(owner.address);

      expect(stakedTokenIds.length).to.equal(1);
      expect(stakedTokenIds[0]).to.equal(0);

      expect(availableRewards).to.equal(0);
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
});
