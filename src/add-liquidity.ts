import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "fs";
import anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
const { BN } = anchor;


const connection = new Connection(clusterApiUrl("devnet"));
const cpAmm = new CpAmm(connection);

const payerKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync("/home/maz/.config/solana/id.json", "utf-8")))
);

const payer = payerKeypair.publicKey;

async function addLiquidity() {

  const poolAddress = new PublicKey("75pihNzDVPgEY6ARGvbQyWKE2hXrXRU7pkVMCJNrviDU")
  const positionAddress = new PublicKey("yzzptjvipeA9uLAg4hijv8Eq3FvHKt32LUJVboBPt4U")
  const positionNftAccount = new PublicKey("6MnhYGG6EmFay8py8Q3gCGQVYb8yg4rjiVhrxiedVLLn")

  const poolState = await cpAmm.fetchPoolState(poolAddress);
  console.log("poolState:", poolState);
  const positionState = await cpAmm.fetchPositionState(positionAddress);
  console.log("positionState:", positionState);

  // Get deposit quote
  const depositQuote = cpAmm.getDepositQuote({
    inAmount: new BN(2_000_000_000_000),
    isTokenA: true,
    minSqrtPrice: poolState.sqrtMinPrice,
    maxSqrtPrice: poolState.sqrtMaxPrice,
    sqrtPrice: poolState.sqrtPrice
  });

  console.log("depositQuote:", depositQuote);

  const tokenAAmount = new BN(2_000_000_000_000);

  try {
    const addLiquidityTx = await cpAmm.addLiquidity({
      owner: payer, //avhi
      pool: poolAddress,
      position: positionAddress,
      positionNftAccount: positionNftAccount,
      liquidityDelta: depositQuote.liquidityDelta,
      maxAmountTokenA: tokenAAmount,
      maxAmountTokenB: depositQuote.outputAmount,
      tokenAAmountThreshold: tokenAAmount,
      tokenBAmountThreshold: tokenAAmount,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID
    });

    const signature = await sendAndConfirmTransaction(connection, addLiquidityTx, [payerKeypair]);
    console.log("WORKING...");
    console.log("signature", signature);

  } catch (error) {
    console.error("Add liquidity failed:", error);
  }

}

addLiquidity();
