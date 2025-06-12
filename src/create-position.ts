import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "fs";

const connection = new Connection(clusterApiUrl("devnet"));
const cpAmm = new CpAmm(connection);

const payerKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync("/home/maz/.config/solana/id.json", "utf-8")))
);

const payer = payerKeypair.publicKey;
const positionNft = Keypair.generate();

async function createPosition() {
  try {
    // const poolAddress = new PublicKey("75pihNzDVPgEY6ARGvbQyWKE2hXrXRU7pkVMCJNrviDU")
    const poolAddress = new PublicKey("GuSPNe9YgtzMzzuCM9UVFWjDgPGtj6yW3qdTawyUPpGG")
    // const owner = new PublicKey("EYosfdo5LurETu3YY6P5jacUr6jhKak3Ue99armeYYs9")

    const createPositionTx = await cpAmm.createPosition({
      owner: payer, //avhi
      payer, //avhi
      pool: poolAddress,
      positionNft: positionNft.publicKey
    });

    const signature = await sendAndConfirmTransaction(connection, createPositionTx, [payerKeypair, positionNft]);
    console.log("signature", signature);
  }

  catch (error) {
    console.error("Position creation failed:", error);
  }
}

createPosition();
