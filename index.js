require("dotenv").config();
const {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  TokenInfoQuery,
  TokenAssociateTransaction
} = require("@hashgraph/sdk");

// Configure accounts and client
const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function createNFT(memo) {
  // Create the NFT
  const nftCreate = new TokenCreateTransaction()
    .setTokenName("Proof Of Attendance")
    .setTokenSymbol("POA")
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(operatorId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(operatorKey)
    .setTokenMemo(memo)
    .freezeWith(client);
  
  const nftCreateSigned = await nftCreate.sign(operatorKey);
  const nftCreateSubmit = await nftCreateSigned.execute(client);
  const nftCreateRx = await nftCreateSubmit.getReceipt(client);
  const tokenId = nftCreateRx.tokenId;

  // Mint new NFT
  const mintTx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([Buffer.from("https://res.cloudinary.com/dwrplzecs/image/upload/v1703008940/qtvzjbssgnbjeenw4o1s.png")])
    .freezeWith(client);
  
  const mintTxSigned = await mintTx.sign(operatorKey);
  const mintTxSubmit = await mintTxSigned.execute(client);
  const mintRx = await mintTxSubmit.getReceipt(client);

  console.log("Creation successful");
  const serialNumber = mintRx.serials[0].low;
  return { tokenId, serialNumber };
}

async function transferNFT(tokenId, serialNumber, receiverAccountId) {
    // Associate the token with the account if not already associated
    const associateTx = await new TokenAssociateTransaction()
            .setAccountId(receiverAccountId)
            .setTokenIds([tokenId])
            .freezeWith(client)
            .sign("Your Private Key");
    
    const associateSubmit = await associateTx.execute(client);
    await associateSubmit.getReceipt(client);
    
    // Transfer the NFT
    const tokenTransferTx = await new TransferTransaction()
        .addNftTransfer(tokenId, serialNumber, operatorId, receiverAccountId)
        .freezeWith(client)
        .sign(operatorKey);

    const tokenTransferSubmit = await tokenTransferTx.execute(client);
    await tokenTransferSubmit.getReceipt(client);

    console.log("Transfer successful");
}

async function getNFTData(tokenId) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(tokenId).execute(client);
  return {
    tokenId: tokenInfo.tokenId.toString(),
    tokenName: tokenInfo.name,
    tokenSymbol: tokenInfo.symbol,
    tokenMemo: tokenInfo.tokenMemo
    
  };
}

async function main() {
  const memo= 'String'
  const { tokenId, serialNumber } = await createNFT(memo);
  const receiverAccountId = 'Account Id';
  await transferNFT(tokenId, serialNumber, receiverAccountId);
  const nftData = await getNFTData(tokenId);
  console.log('NFT Data:', nftData);
}

main().catch(error => {
  console.error(error);
});
