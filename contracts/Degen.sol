
        // SPDX-License-Identifier: MIT


        //   __         ______     __  __     __   __     ______     __  __     __     ______   __    
        //  /\ \       /\  __ \   /\ \/\ \   /\ "-.\ \   /\  ___\   /\ \_\ \   /\ \   /\  ___\ /\ \   
        //  \ \ \____  \ \  __ \  \ \ \_\ \  \ \ \-.  \  \ \ \____  \ \  __ \  \ \ \  \ \  __\ \ \ \  
        //   \ \_____\  \ \_\ \_\  \ \_____\  \ \_\\"\_\  \ \_____\  \ \_\ \_\  \ \_\  \ \_\    \ \_\ 
        //    \/_____/   \/_/\/_/   \/_____/   \/_/ \/_/   \/_____/   \/_/\/_/   \/_/   \/_/     \/_/ 

        pragma solidity >=0.8.13 <0.9.0;

        import "@openzeppelin/contracts/access/Ownable.sol";
        import "erc721a/contracts/ERC721A.sol";
        import "@openzeppelin/contracts/utils/Strings.sol";
        import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
        

        contract SampleDegen is ERC721A, Ownable, ReentrancyGuard  {
            using Strings for uint256;
            uint256 public _maxSupply = 10000;
            uint256 public maxMintAmountPerWallet = 5;
            uint256 public maxMintAmountPerTx = 5; 
            string public baseURL = "";
            string public ExtensionURL = ".json";
            uint256 public  _initalPrice = 0 ether;
            uint256 public costOfNFT = 1 ether;
            uint256 public numberOfFreeNFTs = 2;
            
            uint256 public currentFreeSupply = 0;
            uint256 public freeSupplyLimit = 100;
            string public HiddenURL;
            bool public revealed = false;
            bool public paused = true;
            
            error ContractPaused();
            error MaxMintWalletExceeded();
            error MaxSupply();
            error InvalidMintAmount();
            error InsufficientFund();
            error NoSmartContract();
            error TokenNotExisting();

        constructor(string memory _initBaseURI, string memory _initNotRevealedUri) ERC721A("SampleNFT", "SNFT") {
            baseURL = _initBaseURI;
            HiddenURL = _initNotRevealedUri;
        }

        // ================== Mint Function =======================

        modifier mintCompliance(uint256 _mintAmount) {
            if (msg.sender != tx.origin) revert NoSmartContract();
            if (totalSupply()  + _mintAmount > _maxSupply) revert MaxSupply();
            if (_mintAmount > maxMintAmountPerTx) revert InvalidMintAmount();
            if(paused) revert ContractPaused();
            _;
        }

        modifier mintPriceCompliance(uint256 _mintAmount) {
            if(balanceOf(msg.sender) + _mintAmount > maxMintAmountPerWallet) revert MaxMintWalletExceeded();
            if (_mintAmount < 0 || _mintAmount > maxMintAmountPerWallet) revert InvalidMintAmount();
              if (msg.value < checkCost(_mintAmount)) revert InsufficientFund();
            _;
        }
        
        /// @notice compliance of minting
        /// @dev user (msg.sender) mint
        /// @param _mintAmount the amount of tokens to mint
        function mint(uint256 _mintAmount) public payable mintCompliance(_mintAmount) mintPriceCompliance(_mintAmount){
         
          currentFreeSupply = currentFreeSupply + checkFreemint(_mintAmount);
          _safeMint(msg.sender, _mintAmount);
          }

        /// @dev user (msg.sender) mint
        /// @param _mintAmount the amount of tokens to mint 
        /// @return value from number to mint
        // freenfts =2
        //freeSupplyLimit =100
        //costOfNFT = 1
        

           function checkCost(uint256 _mintAmount) public view returns (uint256) {
          uint256 totalMints = _mintAmount + balanceOf(msg.sender);
          if ((totalMints <= numberOfFreeNFTs) && (currentFreeSupply < freeSupplyLimit)) {
          return _initalPrice;
          } else if ((balanceOf(msg.sender) < numberOfFreeNFTs) && (totalMints > numberOfFreeNFTs) && (currentFreeSupply < freeSupplyLimit)) { 
          uint256 total = costOfNFT * (totalMints - numberOfFreeNFTs);
          return total;
          }
          else {
          uint256 total2 = costOfNFT * _mintAmount;
          return total2;
            }
        }
        
        function checkFreemint(uint256 _mintAmount) public view returns (uint256) {
          uint256 totalMints = _mintAmount + balanceOf(msg.sender);
          if ((totalMints <= numberOfFreeNFTs) && (currentFreeSupply < freeSupplyLimit)) {
          return totalMints;
          } else if ((balanceOf(msg.sender) < numberOfFreeNFTs) && (totalMints > numberOfFreeNFTs) && (currentFreeSupply < freeSupplyLimit)) { 
           return numberOfFreeNFTs - balanceOf(msg.sender);
          }
          else {
          return 0;
            }
        }

        function changeFreeSupplyLimit(uint256 _newSupply)public onlyOwner {
          freeSupplyLimit = _newSupply;
        }
        


        /// @notice airdrop function to airdrop same amount of tokens to addresses
        /// @dev only owner function
        /// @param accounts  array of addresses
        /// @param amount the amount of tokens to airdrop users
        function airdrop(address[] memory accounts, uint256 amount)public onlyOwner mintCompliance(amount) {
          for(uint256 i = 0; i < accounts.length; i++){
          _safeMint(accounts[i], amount);
          }
        }

        // =================== Orange Functions (Owner Only) ===============

        /// @dev pause/unpause minting
        function pause() public onlyOwner {
          paused = !paused;
        }

        
        /// @dev set hidden URI
        /// @param uri  new URI    
        function setHiddenURL(string memory uri) public onlyOwner {
          HiddenURL = uri;
        }

        /// @dev reveal URI
        function setRevealed() public onlyOwner {
          revealed = !revealed;
        }

        /// @dev set URI
        /// @param uri  new URI
        function setbaseURL(string memory uri) public onlyOwner{
          baseURL = uri;
        }

        /// @dev extension URI like 'json'
        function setExtensionURL(string memory uri) public onlyOwner{
          ExtensionURL = uri;
        }
        
        /// @dev set new cost of tokenId in WEI
        /// @param _cost  new price in wei
        function setCostPrice(uint256 _cost) public onlyOwner{
          costOfNFT = _cost;
        } 

        /// @dev only owner
        /// @param supply  new max supply
        function setMaxSupply(uint256 supply) public onlyOwner{
          _maxSupply = supply;
        }

        /// @dev only owner
        /// @param perTx  new max mint per transaction
        function setMaxMintAmountPerTx(uint256 perTx) public onlyOwner{
          maxMintAmountPerTx = perTx;
        }

        /// @dev only owner
        /// @param perWallet  new max mint per wallet
        function setMaxMintAmountPerWallet(uint256 perWallet) public onlyOwner{
          maxMintAmountPerWallet = perWallet;
        }  
        
        /// @dev only owner
        /// @param perWallet set free number of nft per wallet
        function setnumberOfFreeNFTs(uint256 perWallet) public onlyOwner{
          numberOfFreeNFTs = perWallet;
        }            

        // ================================ Withdraw Function ====================

        /// @notice withdraw ether from contract.
        /// @dev only owner function
        function withdraw() public onlyOwner nonReentrant{
          

          

        (bool owner, ) = payable(owner()).call{value: address(this).balance}('');
        require(owner);
        }
        // =================== Blue Functions (View Only) ====================

        /// @dev return uri of token ID
        /// @param tokenId  token ID to find uri for
        ///@return value for 'tokenId uri'
        function tokenURI(uint256 tokenId) public view override(ERC721A) returns (string memory) {
          if (!_exists(tokenId)) revert TokenNotExisting();   

        
        if (revealed == false) {
        return HiddenURL;
        }

        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), ExtensionURL))
        : '';
        }
        
        /// @dev tokenId to start (1)
        function _startTokenId() internal view virtual override returns (uint256) {
          return 1;
        }

        ///@dev maxSupply of token
        /// @return max supply
        function _baseURI() internal view virtual override returns (string memory) {
          return baseURL;
        }

//helper function
    function safeMint(address to , uint amount) public {
          _safeMint(to, amount);
    }

}
            