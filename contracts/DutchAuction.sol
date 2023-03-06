
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

contract AuctionFactory is Ownable{
    event Start(uint itemId, uint tokeId, uint time);
    event Bid(address indexed sender, uint amount);
    event Cancelled( uint tokenId);


   

    address payable public seller;

  error AuctionEnded();
  error AuctionInProcess();
  error TimeToEarly();
  error NotEnoughFunds();
  error NotStarted();
  error ErrorInTIME();


   constructor() {   
     seller = payable(msg.sender);
     }


}



// pragma solidity ^0.8.13;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
///import './AuctionFactory.sol';

   contract SampleDutchAuction is AuctionFactory,ReentrancyGuard     {
        using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _soldCounter;


        enum State {
        Declared,
        Started,
        Running,
        Ended,
        Sold,
        Canceled
    }


    struct Auctions {
        uint token ;
        //starting price bid
        uint startingPrice;
        //how many to reduce ecery x times
        uint discountRate ;
        uint startTime; 
        uint endTime;
        State auctionState;
    }
   //nft collection
    IERC721 immutable nftCollection ;

    //time to decrement the price , in second
    uint immutable timeToCalculate;

    mapping (uint => Auctions) public auction ;

    // event AuctionCreated(address auctionContract, address owner, uint numAuctions, address[] allAuctions);

     constructor(  IERC721 _nftCollection , uint _timeToCalculate
        )  {
        nftCollection = _nftCollection ;
        timeToCalculate= _timeToCalculate;
        // payable(serviceFeeAddress).transfer(serviceFee);
        }



    function createAuction(uint _tokenId, uint _startingPrice, uint _discountRate,  uint _startTime, uint _endTime) external onlyOwner {
      if(_startTime>=_endTime) revert ErrorInTIME();
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        auction[tokenId] = Auctions(
                _tokenId,
                _startingPrice,
                _discountRate,
                _startTime,
                _endTime,
                State.Declared
                );  
    }
    
    
  /**
     * @dev to start the auction
     * can't start if not contract owner neither the auction has not ended
      *  started = true;
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
     * @dev customers to buy
     */

    function AuctionBuy(uint itemId) public payable  {
        if(auction[itemId].auctionState != State.Running) revert NotStarted(); 
          uint end = auction[itemId].endTime ;
        if (block.timestamp > end) revert AuctionEnded();
         
        uint price = getPrice(itemId);
        if(msg.value < price) revert NotEnoughFunds();

        nftCollection.transferFrom(address(this), msg.sender, auction[itemId].token);
        seller.transfer(price);
        _soldCounter.increment();
        auction[itemId].auctionState = State.Sold ;
         // add the sold NFT to the auctionItems array

        emit Bid(msg.sender, msg.value);
    }


 
     /**
     * @dev cancel auction to release nft
     */
    function AuctionCanceled(uint itemId) external onlyOwner{
        if (auction[itemId].startTime < block.timestamp && auction[itemId].endTime > block.timestamp ) revert AuctionInProcess();
        uint tokenId = auction[itemId].token ;
        // auction[itemId].startTime = 0 ;
        // auction[itemId].endTime = 0 ;

        // auction[itemId].auctionState = State.Canceled ;
        nftCollection.safeTransferFrom(address(this), msg.sender, tokenId);
        delete  auction[itemId] ;
        _tokenIdCounter.decrement();

         emit Cancelled (tokenId);
    }

//withdraw money stuck in contract
      function withdraw() public onlyOwner nonReentrant{            
            (bool owner, ) = payable(owner()).call{value: address(this).balance}('');
            require(owner);    
        }


      /**
     * @dev calculate price auction
     */   
    function getPrice(uint itemId) public view returns (uint256) {
        if (auction[itemId].auctionState == State.Canceled ||  auction[itemId].auctionState == State.Sold)
        return  0 ;

        uint256 minutesElapsed = (block.timestamp - auction[itemId].startTime) / timeToCalculate;
        return auction[itemId].startingPrice - (minutesElapsed * auction[itemId].discountRate);
    }

/*set new discount rate to auctionID*/
    function setDiscountRate (uint itemId ,uint256 _discountRate) public onlyOwner {
        auction[itemId].discountRate = _discountRate;
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

/**
 * @dev Get all sold NFTs
 */
    function getSoldNfts() public view returns (Auctions[] memory) {
        uint soldItemCount = _soldCounter.current();
        uint currentIndex = 0;

        Auctions[] memory items = new Auctions[](soldItemCount);
        for (uint i = 0; i <= soldItemCount; i++) {
            if (auction[i+1].auctionState == State.Sold) {
                uint currentId = i + 1;
                Auctions storage currentItem = auction[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }

    return items;
    }



}
        