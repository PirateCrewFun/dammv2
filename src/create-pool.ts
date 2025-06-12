import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction
} from "@solana/web3.js";

import {
  CpAmm,
  getLiquidityDeltaFromAmountA,
  getSqrtPriceFromPrice,
  MAX_SQRT_PRICE,
  getBaseFeeParams,
  getDynamicFeeParams,
} from "@meteora-ag/cp-amm-sdk";
import { Decimal } from "decimal.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { readFileSync } from "fs";
import anchor from "@coral-xyz/anchor";
import type { BN as BNType } from "@coral-xyz/anchor";
const { BN } = anchor;

const connection = new Connection(clusterApiUrl("devnet"));
const cpAmm = new CpAmm(connection);

const payerKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync("/home/maz/.config/solana/id.json", "utf-8")))
);

const payer = payerKeypair.publicKey;
const creator = payer;
const positionNft = Keypair.generate();
const tokenAMint = new PublicKey("DBcgCuDHbvGwZMJ6eCv9J4B4MzAuemftHwHLofVfSM1S");
const tokenBMint = new PublicKey("So11111111111111111111111111111111111111112");
const baseDecimals = 6;
const quoteDecimals = 9;

const tokenAAmount = getAmountInLamports("10000000000", baseDecimals);
// const tokenAAmount = new BN(0);
const tokenBAmount = new BN(2_000_000);

const initPrice = 0.00001394270733422854
// const maxPrice = 0.00002494270733422854
const initSqrtPrice = getSqrtPriceFromPrice(initPrice.toString(), baseDecimals, quoteDecimals);
const minSqrtPrice = initSqrtPrice;
const maxPrice = MAX_SQRT_PRICE
// const maxSqrtPrice = maxPrice
// ? getSqrtPriceFromPrice(maxPrice.toString(), baseDecimals, quoteDecimals)
// : MAX_SQRT_PRICE
// const maxSqrtPrice = new BN(0.00001294270733422854).mul(new BN(10 ** 6));

const liquidityDelta = getLiquidityDeltaFromAmountA(tokenAAmount, initSqrtPrice, maxPrice);
// const liquidityDelta = new BN(0);

const baseFee = getBaseFeeParams(
  5000, // maxBaseFeeBps (0.1%)
  500,  // minBaseFeeBps (0.01%)
  0,    // feeSchedulerMode
  1,    // numberOfPeriod
  86400     // totalDuration
);

const dynamicFee = getDynamicFeeParams(200); // minBaseFeeBps

const poolFees = {
  baseFee,
  protocolFeePercent: 20,
  partnerFeePercent: 0,
  referralFeePercent: 20,
  dynamicFee
};

function getAmountInLamports(amount: number | string, decimals: number): BNType {
  const amountD = new Decimal(amount);
  const amountLamports = amountD.mul(new Decimal(10 ** decimals));
  return new BN(amountLamports.toString());
}

async function createPool() {
  try {
    const { tx, pool, position } = await cpAmm.createCustomPool({
      payer, // The wallet paying for the transaction
      creator, // The creator of the pool
      positionNft: positionNft.publicKey,  // The mint for the initial position NFT
      tokenAMint, // The mint address for token A
      tokenBMint, // The mint address for token B
      tokenAAmount, // Initial amount of token A to deposit
      tokenBAmount, // Initial amount of token B to deposit
      initSqrtPrice, // Minimum sqrt price
      sqrtMinPrice: minSqrtPrice, // Maximum sqrt price
      sqrtMaxPrice: maxPrice,  // Initial sqrt price in Q64 format
      liquidityDelta,  // Initial liquidity in Q64 format
      poolFees, //Fee configuration
      hasAlphaVault: false, // Whether the pool has an alpha vault
      collectFeeMode: 0, // How fees are collected (0: normal, 1: alpha)
      activationPoint: null, // The slot or timestamp for activation
      activationType: 1, // 0: slot, 1: timestamp
      tokenAProgram: TOKEN_PROGRAM_ID, // Token program for token A
      tokenBProgram: TOKEN_PROGRAM_ID // Token program for token A
    });

    //sending the transaction onchain
    const signature = await sendAndConfirmTransaction(connection, tx, [payerKeypair, positionNft]);

    //logging
    console.log("Custom Pool Created");
    console.log("Signature:", signature);
    console.log("Pool Address:", pool?.toBase58?.() ?? pool);
    console.log("Position NFT:", position?.toBase58?.() ?? position);
  } catch (error) {
    console.error("Pool creation failed:", error);
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
  }
}

// calling the function
createPool();
