
 // SPDX-License-Identifier: MIT


/* @author
* ██╗       █████╗  ██╗   ██╗ ███╗   ██╗  ██████╗ ██╗  ██╗ ██╗ ███████╗ ██╗
* ██║      ██╔══██╗ ██║   ██║ ████╗  ██║ ██╔════╝ ██║  ██║ ██║ ██╔════╝ ██║
* ██║      ███████║ ██║   ██║ ██╔██╗ ██║ ██║      ███████║ ██║ █████╗   ██║
* ██║      ██╔══██║ ██║   ██║ ██║╚██╗██║ ██║      ██╔══██║ ██║ ██╔══╝   ██║
* ███████╗ ██║  ██║ ╚██████╔╝ ██║ ╚████║ ╚██████╗ ██║  ██║ ██║ ██║      ██║
* ╚══════╝ ╚═╝  ╚═╝  ╚═════╝  ╚═╝  ╚═══╝  ╚═════╝ ╚═╝  ╚═╝ ╚═╝ ╚═╝      ╚═╝
*
* @custom: verion 1.0.0
*/

pragma solidity >=0.8.13 <0.9.0;
  
  import "@openzeppelin/contracts/access/Ownable.sol";
  
  interface IERC721 {
      function safeTransferFrom(
          address from,
          address to,
          uint tokenId
      ) external;
  
      function transferFrom(
          address,
          address,
          uint
      ) external;
  }
  
  contract EnglishAuction is Ownable{
      event Start(uint itemId, uint tokeId, uint time);
      event Bid(address indexed sender, uint amount);
      event Withdraw(address indexed bidder, uint amount);
      event End(address winner, uint amount);
     
  
      address payable public seller;
  
      // address => auction munber -> amount
      mapping(address => mapping(uint=>uint)) public bids;
      uint public bidderAmount ;  
      
    error NotSeller();
    error AuctionStillRunning();  
    error NotStarted();
    error AuctionEnded();
    error BidHigher();
    error AuctionNotEnded();
    error AlreadyHighestBidder();
    error AuctionInProcess();  
    error TimeToEarly();
  
     constructor() {   
       seller = payable(msg.sender);
       }  
  }

import "@openzeppelin/contracts/utils/Counters.sol";
  contract SampleEnglishAuction is EnglishAuction     {
        using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _soldCounter;

        enum State {
        Declared,
        Started,
        Running,
        Ended,
        Canceled
    }

    struct Auctions {
        uint token ;
        uint startingBid;
        uint highestBid ;
        address highestBidder ;
        uint startTime; 
        uint endTime;
        State auctionState;
    }

    IERC721 immutable nftCollection ;

    mapping (uint => Auctions) public auction ;

    address serviceFeeAddress; 
    uint256 serviceFee;
 

    constructor (  IERC721 _nftCollection 
     ) {
        nftCollection = _nftCollection ;
      
        // payable(serviceFeeAddress).transfer(serviceFee);
        }



    function createAuction(uint _tokenId, uint _startingBid, uint _startTime, uint _endTime) external onlyOwner {
          _tokenIdCounter.increment();
           uint256 tokenId = _tokenIdCounter.current();
         
          auction[tokenId] = Auctions(
                  _tokenId,
                  _startingBid,
                  _startingBid, //_startingBid = highestBid
                  msg.sender,
                  _startTime,
                  _endTime,
                  State.Declared
                );  
    }
    
    
  /**
     * @dev to start the auction
     * can't start if not contract owner neither the auction has not ended
        started = true;
     */
  function AuctionStart(uint itemId) external onlyOwner {
          uint begin = auction[itemId].startTime ;
          uint end = auction[itemId].endTime ;
          
        if (auction[itemId].auctionState != State.Declared) revert AuctionInProcess();
        if (block.timestamp > end) revert AuctionEnded();
        if (block.timestamp < begin) revert TimeToEarly();
        uint tokenId = auction[itemId].token ;
        nftCollection.transferFrom(msg.sender, address(this), tokenId);
        auction[itemId].auctionState = State.Running ;
    
        emit Start(itemId , tokenId , block.timestamp );
  }


/**
 * @dev customers to bid
 * bid if not already higher bidder
 */

  function AuctionBid(uint itemId) public payable  {
        if(auction[itemId].auctionState != State.Running) revert NotStarted(); 
          uint end = auction[itemId].endTime ;
          address highestBidder = auction[itemId].highestBidder ;
          uint highestBid = auction[itemId].highestBid ;
        if (block.timestamp > end) revert AuctionEnded();
        if(msg.sender== highestBidder) revert AlreadyHighestBidder();
        if(msg.value <= highestBid) revert BidHigher();

        if (highestBidder != address(0)) {
            bids[highestBidder][itemId] += highestBid;
        }

        auction[itemId].highestBidder = msg.sender;
        auction[itemId].highestBid  = msg.value;
        bidderAmount+=1 ;

        emit Bid(msg.sender, msg.value);
  }



    
  function AuctionEnd(uint itemId) external onlyOwner {
           
        uint end = auction[itemId].endTime ;
        uint tokenId = auction[itemId].token ;
        address highestBidder = auction[itemId].highestBidder ;
        uint highestBid = auction[itemId].highestBid ;
        if (block.timestamp < end) revert AuctionNotEnded();
        if( auction[itemId].auctionState != State.Running ) revert AuctionEnded();

        auction[itemId].auctionState = State.Ended ;

        if (highestBidder != owner()) {
            nftCollection.safeTransferFrom(address(this), highestBidder, tokenId);
            seller.transfer(highestBid);
             _soldCounter.increment();
        }
         else {
            nftCollection.safeTransferFrom(address(this), seller, tokenId);
              _soldCounter.increment();
        }

        emit End(highestBidder, highestBid);
  }

 
  function AuctionCanceled(uint itemId) external onlyOwner{
        if ( auction[itemId].auctionState != State.Declared ||  auction[itemId].startTime < block.timestamp ) revert AuctionStillRunning();
        // uint tokenId = auction[itemId].token ;
        // auction[itemId].highestBidder = address(0) ;
        // auction[itemId].startTime = 0 ;
        // auction[itemId].endTime = 0 ;

        // auction[itemId].auctionState = State.Canceled ;
        delete auction[itemId] ;
        // nftCollection.safeTransferFrom(address(this), msg.sender, tokenId);
        _tokenIdCounter.decrement();

  }


  /**
   * @dev customers can withdraw the lasts bids unless you are the highest bidder 
   */

  function withdraw(uint itemId) external {
        uint bal = bids[msg.sender][itemId];
        bids[msg.sender][itemId] = 0;
        bidderAmount-=1 ;
        payable(msg.sender).transfer(bal);

        emit Withdraw(msg.sender, bal);
  }




/* Returns all non sold market items */
function getAvailableNFTs() public view returns (uint[] memory) {
    uint[] memory availableNFTs = new uint[](_tokenIdCounter.current() - _soldCounter.current());
    uint currentIndex = 0;

    for (uint i = 1; i <= _tokenIdCounter.current(); i++) {
        if (auction[i].auctionState == State.Running) {
            availableNFTs[currentIndex] = auction[i].token;
            currentIndex += 1;
        }
    }

    return availableNFTs;
}

/* Returns all non sold market items */
function getSoldNFTs() public view returns (Auctions[] memory) {
    uint soldItemCount = _soldCounter.current();
    uint currentIndex = 0;

    Auctions[] memory items = new Auctions[](soldItemCount);
    for (uint i = 0; i < soldItemCount; i++) {
        uint currentId = i + 1;
        Auctions storage currentItem = auction[currentId];
        if (currentItem.auctionState == State.Ended) {
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
    }

    return items;
}




    // function block.timestamp view public returns (uint time){
    //     return  block.timestamp;
    // }


}
        