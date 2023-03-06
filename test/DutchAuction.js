const { expect, assert } = require("chai");

const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
// const { BigNumber } = require("ethers");
const {
  increase,
  increaseTo,
} = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time");

// const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");

describe("Dutch Auction hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const [owner, addr1, addr2] = await ethers.getSigners();

    const erc721 = await ethers.getContractFactory("MockERC721");
    const erc721_address = await erc721.deploy();
    await erc721_address.deployed();

    const timeToCalculate = 60; //1 min

    const Token = await ethers.getContractFactory("SampleDutchAuction");
    const hardhatToken = await Token.deploy(
      erc721_address.address,
      timeToCalculate
    );

    await erc721_address.connect(addr1).safeMint(addr1.address);
    await erc721_address.safeMint(owner.address);

    await erc721_address.setApprovalForAll(hardhatToken.address, true);

    // Fixtures can return anything you consider useful for your tests
    return {
      Token,
      hardhatToken,
      owner,
      addr1,
      addr2,
      erc721_address,
    };
  }

  //   const { hardhatToken, erc721_address, owner, addr1 } = await loadFixture(
  //   deployTokenFixture
  // );

  describe("createAuction", function () {
    it("should create a new auction with the specified parameters", async function () {
      const { hardhatToken, erc721_address, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      // await erc721_address.connect(addr1).safeMint(addr1.address);

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = ethers.utils.parseEther("0.00001");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      const auction = await hardhatToken.auction(tokenId);

      expect(auction.token).to.equal(tokenId);
      expect(auction.startingPrice).to.equal(startingBid);
      expect(auction.discountRate).to.equal(discountRate);
      expect(auction.startTime).to.equal(startTime);
      expect(auction.endTime).to.equal(endTime);
      expect(auction.auctionState).to.equal(0); // State.Declared
    });

    it("should revert if start_time bigger or equal to end_time", async function () {
      const { hardhatToken, erc721_address, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      // await erc721_address.connect(addr1).safeMint(addr1.address);

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime - 1;
      const tokenId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = ethers.utils.parseEther("0.00001");

      await expect(
        hardhatToken.createAuction(
          tokenId,
          startingBid,
          discountRate,
          startTime,
          endTime
        )
      ).to.be.revertedWithCustomError(hardhatToken, "ErrorInTIME");
    });

    it("should only be called by the hardhatToken owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 123;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await expect(
        hardhatToken
          .connect(addr1)
          .createAuction(tokenId, startingBid, discountRate, startTime, endTime)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should increment the token ID counter", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 123;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      const tx = await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      const tokenId2 = tokenId + 1;
      await hardhatToken.createAuction(
        tokenId2,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      const auction2 = await hardhatToken.auction(2);

      expect(auction2.token).to.equal(tokenId2);
    });
  });

  // Start of the test suite
  describe("Auction start", function () {
    it("should not allow non-hardhatToken owner to start an auction", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      // Try to start the auction from a non-owner account
      await expect(
        hardhatToken.connect(addr1).AuctionStart(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Verify that the auction state has not changed
      const auctionState = await hardhatToken.auction(1);
      expect(auctionState.token).to.equal(0);
    });

    it("should not allow an auction to start if the owner doesnt own a tokenId", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 123;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;
      const itemId = 1;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);

      await expect(hardhatToken.AuctionStart(itemId)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
      //ERC721: transfer from incorrect owner
    });

    it("should revert if the auction has been already declared", async function () {
      const { hardhatToken, addr2 } = await loadFixture(deployTokenFixture);
      const startTime = Math.floor(Date.now() / 1000); // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      // const followingBid = ethers.utils.parseEther("1.5");
      const discountRate = 1000;
      const itemId = 1;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await hardhatToken.AuctionStart(itemId);
      // await hardhatToken
      //   .connect(addr2)
      //   .AuctionBid(tokenId, { value: followingBid });

      await expect(
        hardhatToken.AuctionStart(itemId)
      ).to.be.revertedWithCustomError(hardhatToken, "AuctionInProcess");
    });

    it("should start the auction if conditions are met", async function () {
      const { hardhatToken, erc721_address } = await loadFixture(
        deployTokenFixture
      );
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      const auctionInfo = await hardhatToken.auction(itemId);
      expect(auctionInfo.token).to.equal(tokenId);
      expect(auctionInfo.startingPrice).to.equal(startingBid);
      expect(auctionInfo.discountRate).to.equal(discountRate);
      expect(auctionInfo.startTime).to.equal(startTime);
      expect(auctionInfo.endTime).to.equal(endTime);
      expect(auctionInfo.auctionState).to.equal(2); //running

      expect(await erc721_address.ownerOf(tokenId)).to.equal(
        hardhatToken.address
      );
    });
  });

  describe("AuctionBuy", function () {
    it("should buy an auction and transfer the NFT and funds", async function () {
      const { hardhatToken, erc721_address, addr1, owner } = await loadFixture(
        deployTokenFixture
      );
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      const sellerBalance = await ethers.provider.getBalance(owner.address);

      // Buy the auction
      await hardhatToken
        .connect(addr1)
        .AuctionBuy(itemId, { value: startingBid });

      // Verify that the NFT and funds were transferred correctly
      const sellerBalanceAfter = await ethers.provider.getBalance(
        owner.address
      );
      expect(await erc721_address.ownerOf(tokenId)).to.equal(addr1.address);

      //  expect(updatedBuyerBalance.sub(initialBuyerBalance)).to.equal(0); // All funds were used to buy the NFT
      expect(sellerBalanceAfter.sub(sellerBalance)).to.equal(startingBid); // The buyer paid the full price
    });

    it("should revert if the auction has not started", async function () {
      const { hardhatToken, erc721_address, addr1, owner } = await loadFixture(
        deployTokenFixture
      );
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);

      await expect(
        hardhatToken.connect(addr1).AuctionBuy(1, { value: startingBid })
      ).to.be.revertedWithCustomError(hardhatToken, "NotStarted");
    });

    it("should revert if the auction has ended", async function () {
      const { hardhatToken, erc721_address, addr1, owner } = await loadFixture(
        deployTokenFixture
      );
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);
      await time.increaseTo(endTime + 1);
      await expect(
        hardhatToken.connect(addr1).AuctionBuy(1, { value: startingBid })
      ).to.be.revertedWithCustomError(hardhatToken, "AuctionEnded");
    });

    it("should revert if the buyer does not send enough funds", async function () {
      const { hardhatToken, erc721_address, addr1, owner } = await loadFixture(
        deployTokenFixture
      );
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      await expect(
        hardhatToken.connect(addr1).AuctionBuy(1, { value: 99 })
      ).to.be.revertedWithCustomError(hardhatToken, "NotEnoughFunds");
    });
  });

  describe("AuctionCanceled", function () {
    it("should revert if not called by the owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const itemId = 1;
      await expect(
        hardhatToken.connect(addr1).AuctionCanceled(itemId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if auction has started and not ended", async function () {
      const { hardhatToken, erc721_address, owner } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      await expect(
        hardhatToken.AuctionCanceled(itemId)
      ).to.be.revertedWithCustomError(hardhatToken, "AuctionInProcess");
    });

    it("should cancel the auction before  transfer the NFT back to the seller", async function () {
      const { hardhatToken, erc721_address, owner } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);
      await time.increaseTo(endTime + 1);
      await hardhatToken.AuctionCanceled(itemId);

      const auctionState = await hardhatToken.auction(itemId);

      expect(auctionState.auctionState).to.equal(0); //Canceled
      expect(auctionState.startTime).to.equal(0);
      expect(auctionState.endTime).to.equal(0);

      expect(await erc721_address.ownerOf(tokenId)).to.equal(owner.address);
      // expect(contractTokenBalanceAfter).to.equal(
      //   contractTokenBalanceBefore.sub(1)
      // );
    });
  });

  describe("Withdraw", async () => {
    it("should withdraw funds", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);

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

  describe("getPrice()", function () {
    it("should return 0 if auction is canceled", async function () {
      // Set up an auction with the Canceled state

      const { hardhatToken, erc721_address, owner } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);
      await time.increaseTo(endTime + 1);
      await hardhatToken.AuctionCanceled(itemId);

      // Call getPrice() and check that it returns 0
      const price = await hardhatToken.getPrice(itemId);
      expect(price).to.equal(0);
    });

    it("should return 0 if auction is  sold", async function () {
      // Set up an auction with the Canceled state

      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 1000;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      await hardhatToken
        .connect(addr1)
        .AuctionBuy(itemId, { value: startingBid });

      // Call getPrice() and check that it returns 0
      const price = await hardhatToken.getPrice(itemId);
      expect(price).to.equal(0);
    });

    it("should calculate the correct price based on discount rate", async function () {
      // Set up an auction with a starting price of 100 and a discount rate of 10
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = 100;
      const discountRate = 10;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);
      // Advance the block timestamp by 2 minutes (120 seconds)
      await time.increaseTo(startTime + 120);

      // Call getPrice() and check that it returns the expected price
      const price = await hardhatToken.getPrice(itemId);
      expect(price).to.equal(80); // starting price (100) - discount rate (10 * 2 minutes = 20)
    });
  });

  describe("setDiscountRate()", function () {
    it("should revert if non-owner tries to withdraw funds", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
      const itemId = 1;
      const newRate = 5;

      await expect(
        hardhatToken.connect(addr1).setDiscountRate(itemId, newRate)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should update the discount rate for an auction", async function () {
      // Set up an auction with a discount rate of 10

      const { hardhatToken, erc721_address, addr1, owner } = await loadFixture(
        deployTokenFixture
      );
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = 100;
      const discountRate = 10;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      // Update the discount rate to 5
      await hardhatToken.setDiscountRate(itemId, 5);
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);
      // Advance the block timestamp by 2 minutes (120 seconds)
      await time.increaseTo(startTime + 120);

      // Call getPrice() and check that it returns the expected price
      const price = await hardhatToken.getPrice(itemId);
      expect(price).to.equal(90); // starting price (100) - discount rate (5 * 1 minute = 5)
    });
  });

  describe("getSoldNfts", function () {
    it("should return all sold NFTs", async function () {
      // Start auction for NFT
      const { hardhatToken, erc721_address, addr1, owner, addr2 } =
        await loadFixture(deployTokenFixture);
      // Try to start the same auction again

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = 100;
      const discountRate = 10;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      // Make a bid on NFT1
      await hardhatToken
        .connect(addr1)
        .AuctionBuy(itemId, { value: startingBid });

      // End auction for NFT1

      await erc721_address.safeMint(owner.address);
      // Start auction for NFT2
      await time.increaseTo(startTime + 1000);

      const startTime2 = startTime + 1000; // start in one hour
      const tokenId2 = 2;
      const itemId2 = 2;
      const startingBid2 = 500;
      const discountRate2 = 20;

      await hardhatToken.createAuction(
        tokenId2,
        startingBid2,
        discountRate2,
        startTime2,
        endTime
      );
      await hardhatToken.AuctionStart(itemId2);

      await time.increase(120);

      // Make a bid on NFT2
      await hardhatToken.connect(addr2).AuctionBuy(itemId2, { value: 460 });

      // End auction for NFT2

      // Get all sold NFTs
      const soldNfts = await hardhatToken.getSoldNfts();

      // Verify that the correct NFTs were sold
      expect(soldNfts.length).to.equal(2);
      expect(soldNfts[0].token).to.equal(1);
      expect(soldNfts[1].token).to.equal(2);
    });
  });

  // Test the getOpenNfts function
  describe("getAvailableNFTs", function () {
    it("returns an array of all open NFTs", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = 100;
      const discountRate = 10;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      // Get the array of open NFTs
      const openNFTs = await hardhatToken.getAvailableNFTs();

      // Verify that the array contains the open NFT
      expect(openNFTs.length).to.equal(1);
      // expect(openNFTs[0].auctionState).to.equal(1);
      expect(openNFTs[0]).to.equal(tokenId);
    });

    it("returns an array of all open NFTs if sold one should be removed from list", async function () {
      const { hardhatToken, owner, erc721_address, addr1 } = await loadFixture(
        deployTokenFixture
      );

      await erc721_address.safeMint(owner.address);

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const tokenId2 = 2;
      const itemId2 = 2;
      const startingBid = ethers.utils.parseEther("1.0");
      const discountRate = 10;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        discountRate,
        startTime,
        endTime
      );

      await hardhatToken.createAuction(
        tokenId2,
        startingBid,
        discountRate,
        startTime,
        endTime + 3000
      );

      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);
      await hardhatToken.AuctionStart(itemId2);

      // Get the array of open NFTs
      const openNFTsBefore = await hardhatToken.getAvailableNFTs();

      await hardhatToken
        .connect(addr1)
        .AuctionBuy(itemId, { value: startingBid });

      const openNFTsAfter = await hardhatToken.getAvailableNFTs();

      // Verify that the array contains the open NFT
      //1st bid
      expect(openNFTsBefore.length).to.equal(2);
      expect(openNFTsBefore[0]).to.equal(tokenId);
      expect(openNFTsBefore[1]).to.equal(tokenId2);
      //after bid

      expect(openNFTsAfter.length).to.equal(1);
      expect(openNFTsAfter[0]).to.equal(tokenId2);
    });
  });
});
