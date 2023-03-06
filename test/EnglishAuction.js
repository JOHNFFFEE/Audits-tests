const { expect } = require("chai");

const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

// const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");

describe("EnglishAuction hardhatToken", function () {
  async function deployTokenFixture() {
    // Get the hardhatTokenFactory and Signers here.
    const [owner, addr1, addr2] = await ethers.getSigners();

    const erc721 = await ethers.getContractFactory("MockERC721");
    const erc721_address = await erc721.deploy();
    await erc721_address.deployed();

    const Token = await ethers.getContractFactory("SampleEnglishAuction");
    const hardhatToken = await Token.deploy(erc721_address.address);

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

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      const auction = await hardhatToken.auction(tokenId);

      expect(auction.token).to.equal(tokenId);
      expect(auction.startingBid).to.equal(startingBid);
      expect(auction.highestBid).to.equal(startingBid);
      expect(auction.highestBidder).to.equal(owner.address);
      expect(auction.startTime).to.equal(startTime);
      expect(auction.endTime).to.equal(endTime);
      expect(auction.auctionState).to.equal(0); // State.Declared
    });

    it("should only be called by the hardhatToken owner", async function () {
      const { hardhatToken, erc721_address, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 123;
      const startingBid = ethers.utils.parseEther("1.0");

      await expect(
        hardhatToken
          .connect(addr1)
          .createAuction(tokenId, startingBid, startTime, endTime)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should increment the token ID counter", async function () {
      const { hardhatToken, erc721_address, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 123;
      const startingBid = ethers.utils.parseEther("1.0");

      const tx = await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await tx.wait();

      const tokenId2 = tokenId + 1;
      await hardhatToken.createAuction(
        tokenId2,
        startingBid,
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
      const tokenId = 2;
      const startingBid = ethers.utils.parseEther("1.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);

      await expect(hardhatToken.AuctionStart(1)).to.be.revertedWith(
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
      const followingBid = ethers.utils.parseEther("1.5");
      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );

      await hardhatToken.AuctionStart(1);
      await hardhatToken
        .connect(addr2)
        .AuctionBid(tokenId, { value: followingBid });

      await expect(hardhatToken.AuctionStart(1)).to.be.revertedWithCustomError(
        hardhatToken,
        "AuctionInProcess"
      );
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

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);
      await hardhatToken.AuctionStart(itemId);

      const auctionInfo = await hardhatToken.auction(itemId);
      expect(auctionInfo.token).to.equal(tokenId);
      expect(auctionInfo.startingBid).to.equal(startingBid);
      expect(auctionInfo.startTime).to.equal(startTime);
      expect(auctionInfo.endTime).to.equal(endTime);
      expect(auctionInfo.auctionState).to.equal(2); //running

      expect(await erc721_address.ownerOf(tokenId)).to.equal(
        hardhatToken.address
      );
    });
  });

  describe("AuctionBid", function () {
    it("should revert if auction was not started", async function () {
      const { hardhatToken, addr2 } = await loadFixture(deployTokenFixture);

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 2;
      const startingBid = ethers.utils.parseEther("1.0");
      const itemId = 1;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );

      await expect(
        hardhatToken.connect(addr2).AuctionBid(itemId, {
          value: startingBid,
        })
      ).to.be.revertedWithCustomError(hardhatToken, "NotStarted");
    });

    it("should revert if auction has ended", async function () {
      const { hardhatToken, addr2 } = await loadFixture(deployTokenFixture);

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const bidAmount = ethers.utils.parseEther("1.5");
      const itemId = 1;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      await time.increaseTo(endTime + 1);

      await expect(
        hardhatToken.connect(addr2).AuctionBid(itemId, {
          value: bidAmount,
        })
      ).to.be.revertedWithCustomError(hardhatToken, "AuctionEnded");
    });

    it("should allow a bidder to place a higher bid", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const bidAmount = ethers.utils.parseEther("1.5");
      const bidAmount2 = ethers.utils.parseEther("1.6");
      const itemId = 1;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      await hardhatToken.connect(addr1).AuctionBid(itemId, {
        value: bidAmount,
      });

      const auctionInfo = await hardhatToken.auction(itemId);

      expect(auctionInfo.highestBid).to.equal(bidAmount);
      expect(auctionInfo.highestBidder).to.equal(addr1.address);

      await hardhatToken.connect(addr2).AuctionBid(itemId, {
        value: bidAmount2,
      });

      const auctionInfo1 = await hardhatToken.auction(itemId);

      expect(auctionInfo1.highestBid).to.equal(bidAmount2);
      expect(auctionInfo1.highestBidder).to.equal(addr2.address);
    });

    it("should revert if the bidder is already the highest bidder", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const bidAmount = ethers.utils.parseEther("1.5");
      const bidAmount2 = ethers.utils.parseEther("1.6");
      const itemId = 1;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      await expect(
        hardhatToken.AuctionBid(itemId, {
          value: bidAmount2,
        })
      ).to.be.revertedWithCustomError(hardhatToken, "AlreadyHighestBidder");
    });

    it("should revert if the bid is not higher than the current highest bid", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const bidAmount = ethers.utils.parseEther("0.5");
      const itemId = 1;

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);
      await expect(
        hardhatToken.connect(addr1).AuctionBid(itemId, {
          value: bidAmount,
        })
      ).to.be.revertedWithCustomError(hardhatToken, "BidHigher");
    });
  });

  describe("AuctionEnd", function () {
    it("should revert if not called by the owner", async function () {
      const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);

      const itemId = 1;
      await expect(
        hardhatToken.connect(addr1).AuctionEnd(itemId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if the auction has not ended", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      expect(hardhatToken.AuctionEnd(itemId)).to.be.revertedWithCustomError(
        hardhatToken,
        "AuctionNotEnded"
      );
    });

    it("should revert if the auction is not running", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );

      await time.increaseTo(endTime + 1);

      // const auctionInfo = await hardhatToken.auction(itemId);

      await expect(
        hardhatToken.AuctionEnd(itemId)
      ).to.be.revertedWithCustomError(hardhatToken, "AuctionEnded");
    });

    it("should transfer the NFT to the highest bidder and pay the seller", async function () {
      const { hardhatToken, addr1, owner, erc721_address } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const higherBid = ethers.utils.parseEther("2.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      // Make a bid
      await hardhatToken
        .connect(addr1)
        .AuctionBid(itemId, { value: higherBid });

      await time.increaseTo(endTime + 1);

      //seller get payed

      const sellerBalanceBefore = await ethers.provider.getBalance(
        owner.address
      );
      // Check the seller balance
      await expect(hardhatToken.AuctionEnd(itemId)).to.changeEtherBalance(
        owner,
        higherBid,
        { includeFee: false }
      );

      // Check the NFT ownership
      const owners = await erc721_address.ownerOf(tokenId);
      expect(owners).to.equal(addr1.address);
    });

    it("should transfer the NFT back to the seller if there were no bids", async function () {
      const { hardhatToken, erc721_address, owner } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);
      await time.increaseTo(endTime + 1);

      // End the auction
      await hardhatToken.AuctionEnd(itemId);

      // Check the NFT ownership
      const owners = await erc721_address.ownerOf(tokenId);
      expect(owners).to.equal(owner.address);
    });

    // it("should emit the End event with the highest bidder and bid amount", async function () {
    //   // Make a bid
    //   await hardhatToken
    //     .connect(bidder)
    //     .AuctionBid(itemId, { value: higherBid });

    //   // End the auction
    //   const tx = await hardhatToken.AuctionEnd(itemId);
    //   const receipt = await tx.wait();

    //   // Check the event
    //   const event = receipt.events.find((e) => e.event === "End");
    //   expect(event.args[0]).to.equal(bidder.address);
    //   expect(event.args[1]).to.equal(higherBid);
    // });
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

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      await expect(
        hardhatToken.AuctionCanceled(itemId)
      ).to.be.revertedWithCustomError(hardhatToken, "AuctionStillRunning");
    });

    it("should revert if auction time passed", async function () {
      const { hardhatToken } = await loadFixture(deployTokenFixture);
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );

      await time.increaseTo(startTime + 1);
      await expect(hardhatToken.AuctionCanceled(itemId)).to.be.reverted;
    });

    it("should cancel the auction and transfer the NFT back to the seller", async function () {
      const { hardhatToken, erc721_address, owner } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime - 10);

      // await hardhatToken.AuctionStart(itemId);

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

  describe("withdraw", function () {
    it("should allow bidders to withdraw their bids if not the last highestBidder", async function () {
      const { hardhatToken, addr1, owner, addr2 } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const higherBid = ethers.utils.parseEther("2.0");
      const higherrBid = ethers.utils.parseEther("2.1");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      // addr1 Make a bid
      await hardhatToken
        .connect(addr1)
        .AuctionBid(itemId, { value: higherBid });

      // addr2 Make a bid
      await hardhatToken
        .connect(addr2)
        .AuctionBid(itemId, { value: higherrBid });

      // Check the seller balance
      await expect(
        hardhatToken.connect(addr1).withdraw(itemId)
      ).to.changeEtherBalance(addr1, higherBid, { includeFee: false });

      // await time.increaseTo(endTime + 1);

      //seller get payed

      // const sellerBalanceBefore = await ethers.provider.getBalance(
      //   owner.address
      // );
      // // Check the seller balance
      // await expect(hardhatToken.AuctionEnd(itemId)).to.changeEtherBalance(
      //   owner,
      //   higherBid,
      //   { includeFee: false }
      // );

      // // Withdraw the bid from bidder1
      // await auctionContract.connect(bidder1).withdraw(auctionId);

      // // Get the balance of bidder1 after withdrawing
      // const balanceAfter = await ethers.provider.getBalance(bidder1.address);

      // // Check that the balance increased by the withdrawn amount
      // expect(balanceAfter).to.equal(balanceBefore.add(bid1));
    });

    it("should not allow bidders to withdraw their bids if is highestBidder", async function () {
      const { hardhatToken, addr1, owner, addr2 } = await loadFixture(
        deployTokenFixture
      );
      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const higherBid = ethers.utils.parseEther("2.0");
      const higherrBid = ethers.utils.parseEther("2.1");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      // addr1 Make a bid
      await hardhatToken
        .connect(addr1)
        .AuctionBid(itemId, { value: higherBid });

      // // Check that the balance increased by the withdrawn amount
      await expect(
        hardhatToken.connect(addr2).withdraw(itemId)
      ).to.changeEtherBalance(addr2, 0, { includeFee: false });
    });

    it("should not allow a bidder to withdraw a bid that doesn't exist", async function () {
      const { hardhatToken, addr1, owner, addr2 } = await loadFixture(
        deployTokenFixture
      );
      const itemId = 2;
      // Try to withdraw a bid that doesn't exist
      await expect(hardhatToken.connect(addr1).withdraw(itemId)).to.be.reverted;
    });
  });

  // describe("Auction getSoldNfts", function () {
  //   // Test for the getSoldNfts function
  //   it("Should return all sold market items", async function () {
  //     // Create and declare auction
  //     const owner = await ethers.getSigner(0);
  //     const nftCollection = await ethers.getContractAt(
  //       "IERC721",
  //       "NFTCollectionAddress"
  //     );
  //     const tokenId = 1;
  //     const startingBid = ethers.utils.parseEther("1");
  //     await nftCollection.approve(marketplace.address, tokenId);
  //     await marketplace.createAuction(
  //       nftCollection.address,
  //       tokenId,
  //       startingBid,
  //       100,
  //       200
  //     );

  //     // Make a bid on the auction
  //     const bidder = await ethers.getSigner(1);
  //     const bid = ethers.utils.parseEther("2");
  //     await marketplace.connect(bidder).placeBid(1, { value: bid });

  //     // End the auction
  //     await ethers.provider.send("evm_increaseTime", [200]);
  //     await ethers.provider.send("evm_mine", []);

  //     // Check that auction is in ended state and transfer NFT to highest bidder
  //     const soldNfts = await marketplace.getSoldNfts();
  //     expect(soldNfts.length).to.equal(1);
  //     expect(soldNfts[0].token).to.equal(tokenId);
  //     expect(soldNfts[0].highestBid).to.equal(bid);
  //     expect(soldNfts[0].highestBidder).to.equal(await bidder.getAddress());
  //     expect(soldNfts[0].auctionState).to.equal(2); // Ended state
  //   });
  // });
  // describe("Auction getOpenNfts", function () {
  //   it("Should return all non sold market items", async function () {
  //     // Retrieve the open auctions
  //     const openAuctions = await marketplace.getOpenNfts();

  //     // Check that the returned array only includes the auction in "Running" state
  //     expect(openAuctions.length).to.equal(1);
  //     expect(openAuctions[0].token).to.equal(1);
  //     expect(openAuctions[0].auctionState).to.equal(1);
  //   });
  // });

  describe("getSoldNFTS", function () {
    it("returns an array of all sold NFTs (not to owner)", async function () {
      const { hardhatToken, addr1, erc721_address, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");
      const higherBid = ethers.utils.parseEther("2.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );
      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);

      // addr1 Make a bid
      await hardhatToken
        .connect(addr1)
        .AuctionBid(itemId, { value: higherBid });
      await time.increaseTo(endTime + 1);

      await hardhatToken.AuctionEnd(1);

      // Get the array of sold NFTs
      const soldNFTs = await hardhatToken.getSoldNFTs();

      // Verify that the array contains the sold NFT
      expect(soldNFTs.length).to.equal(1);
      expect(soldNFTs[0].highestBidder).to.equal(addr1.address);
      expect(soldNFTs[0].highestBid).to.equal(higherBid);
      expect(soldNFTs[0].token).to.equal(tokenId);

      //buyer
      expect(await erc721_address.ownerOf(tokenId)).to.equal(addr1.address);
    });
  });

  // Test the getOpenNfts function
  describe("getAvailableNFTs", function () {
    it("returns an array of all open NFTs", async function () {
      const { hardhatToken, addr1, erc721_address, addr2 } = await loadFixture(
        deployTokenFixture
      );

      const startTime = Math.floor(Date.now() / 1000) + 3600; // start in one hour
      const endTime = startTime + 3600; // end in two hours
      const tokenId = 1;
      const itemId = 1;
      const startingBid = ethers.utils.parseEther("1.0");

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
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
      const { hardhatToken, owner, erc721_address } = await loadFixture(
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

      await hardhatToken.createAuction(
        tokenId,
        startingBid,
        startTime,
        endTime
      );

      await hardhatToken.createAuction(
        tokenId2,
        startingBid,
        startTime,
        endTime + 3000
      );

      await time.increaseTo(startTime + 1);

      await hardhatToken.AuctionStart(itemId);
      await hardhatToken.AuctionStart(itemId2);

      // Get the array of open NFTs
      const openNFTsBefore = await hardhatToken.getAvailableNFTs();

      await time.increaseTo(endTime + 1);

      await hardhatToken.AuctionEnd(tokenId);

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
