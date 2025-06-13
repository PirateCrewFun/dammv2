import {
  getExplorerLink,
  createSolanaClient,
  getSignatureFromTransaction,
  signTransactionMessageWithSigners,
  address,
} from "gill";
import type { SolanaClusterMoniker } from "gill";
import { loadKeypairSignerFromFile } from "gill/node";
import {
  buildMintTokensTransaction,
  TOKEN_PROGRAM_ADDRESS,
} from "gill/programs/token";
import fs from "fs";
import path from "path";

async function main() {
  const signer = await loadKeypairSignerFromFile();
  const cluster: SolanaClusterMoniker = "devnet";

  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const mintPath = path.resolve(__dirname, "mint.json");

  const { mintAddress, recipientAddress } = JSON.parse(
    fs.readFileSync(mintPath, "utf-8")
  );

  const mint = address(mintAddress);
  const destination = address(recipientAddress);

  const tokensToMint = BigInt(100_000_000_000); // 100B
  const decimals = BigInt(6);
  const amount = tokensToMint * (BigInt(10) ** decimals);

  const mintTokensTx = await buildMintTokensTransaction({
    feePayer: signer,
    latestBlockhash,
    mint,
    mintAuthority: signer,
    amount,
    destination,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const signedTx = await signTransactionMessageWithSigners(mintTokensTx);
  const signature = getSignatureFromTransaction(signedTx);

  console.log("Mint tokens tx signature:", signature);
  console.log("Explorer link:", getExplorerLink({ cluster, transaction: signature }));

  await sendAndConfirmTransaction(signedTx);
  console.log("Minted 100B tokens to recipient.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

