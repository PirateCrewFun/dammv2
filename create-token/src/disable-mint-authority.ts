import { Connection, Keypair, sendAndConfirmTransaction, Transaction, PublicKey } from "@solana/web3.js";
import { createSetAuthorityInstruction, AuthorityType, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";
import path from "path";

async function main() {

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const mintPath = path.resolve(__dirname, "mint.json");
  const { mintAddress } = JSON.parse(fs.readFileSync(mintPath, "utf-8"));

  const keypairPath = path.resolve(process.env.HOME || "~", ".config/solana/id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secret));

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const ix = createSetAuthorityInstruction(
    new PublicKey(mintAddress),
    keypair.publicKey,
    AuthorityType.MintTokens,
    null,
    [],
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);

  console.log("Disable mint authority tx signature:", sig);
  console.log(
    "Explorer link:",
    `https://explorer.solana.com/tx/${sig}?cluster=devnet`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 