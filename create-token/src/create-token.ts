import {
  getExplorerLink,
  createSolanaClient,
  getSignatureFromTransaction,
  signTransactionMessageWithSigners,
  generateKeyPairSigner,
  address,
} from "gill";
import type { SolanaClusterMoniker } from "gill";
import { loadKeypairSignerFromFile } from "gill/node";
import {
  buildCreateTokenTransaction,
  buildMintTokensTransaction,
  TOKEN_PROGRAM_ADDRESS,
} from "gill/programs/token";
import fs from "fs";
import path from "path";

async function main() {
  const signer = await loadKeypairSignerFromFile();
  console.log("Fee payer address:", signer.address);

  const cluster: SolanaClusterMoniker = "devnet";
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const mint = await generateKeyPairSigner();
  console.log("Mint address:", mint.address);

  // Step 1: Create token with mint authority (the signer)
  const createTokenTx = await buildCreateTokenTransaction({
    feePayer: signer,
    latestBlockhash,
    mint,
    mintAuthority: signer, // Set the signer as mint authority
    freezeAuthority: undefined,
    metadata: {
      isMutable: true,
      name: "Fake Token",
      symbol: "FAKE",
      uri: "https://gold-bitter-guan-406.mypinata.cloud/ipfs/bafkreiczu2z6mt4i4yfj5io226m7n53yf27k4ndssls7cgvy3i6v35lezm",
    },
    decimals: 6,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const signedTx = await signTransactionMessageWithSigners(createTokenTx);
  const signature = getSignatureFromTransaction(signedTx);

  console.log("Create mint tx signature:", signature);
  console.log("Explorer link:", getExplorerLink({ cluster, transaction: signature }));
  await sendAndConfirmTransaction(signedTx);

  const recipientAddress = "E6UcK3dSFc2yaFtEb35pc1WsBVcrPhEbnB87YoNDXhqy";

  // Step 2: Mint 100 billion tokens to recipient
  // Note: This assumes the recipient already has an Associated Token Account
  const tokensToMint = BigInt(100_000_000_000); // 100B
  const decimals = BigInt(6);
  const amount = tokensToMint * (BigInt(10) ** decimals);

  const { value: latestBlockhash2 } = await rpc.getLatestBlockhash().send();
  const mintTokensTx = await buildMintTokensTransaction({
    feePayer: signer,
    latestBlockhash: latestBlockhash2,
    mint: mint.address,
    mintAuthority: signer,
    amount,
    destination: address(recipientAddress), // Use address function to convert string to address type
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    computeUnitLimit: 400_000, // Increase compute unit limit for large mint
  });

  const signedMintTx = await signTransactionMessageWithSigners(mintTokensTx);
  const mintSignature = getSignatureFromTransaction(signedMintTx);

  console.log("Mint tokens tx signature:", mintSignature);
  console.log("Explorer link:", getExplorerLink({ cluster, transaction: mintSignature }));
  await sendAndConfirmTransaction(signedMintTx);
  console.log("Minted 100B tokens to recipient.");

  // Step 3: Disable mint authority by setting it to null
  // Note: This requires using the lower-level SPL token functions
  // For now, we'll just log the instruction that would be needed
  console.log("To disable mint authority, you would need to call:");
  console.log("createSetAuthorityInstruction with AuthorityType.MintTokens and newAuthority = null");
  console.log("This requires using the @solana/spl-token library directly");

  const mintData = {
    tokenName: "Fake Token",
    tokenSymbol: "FAKE",
    mintAddress: mint.address,
    recipientAddress,
    createExplorer: getExplorerLink({ cluster, transaction: signature }),
    mintExplorer: getExplorerLink({ cluster, transaction: mintSignature }),
    note: "Mint authority is still enabled. To disable it, use createSetAuthorityInstruction from @solana/spl-token",
  };

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const outputPath = path.resolve(__dirname, "mint.json");
  fs.writeFileSync(outputPath, JSON.stringify(mintData, null, 2));

  console.log(`Saved mint info to ${outputPath}`);
  console.log("\nNext steps:");
  console.log("1. Create an Associated Token Account for the recipient");
  console.log("2. Use createSetAuthorityInstruction to disable mint authority");
  console.log("3. The token will then be permanently locked (no more minting possible)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

