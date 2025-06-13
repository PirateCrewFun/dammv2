import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import DLMM, { StrategyType } from '@meteora-ag/dlmm';
import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import bs58 from 'bs58';

const main = async () => {
  const connection = new Connection(process.env.RPC_URL!, 'confirmed');
  console.log("connection", connection);

  const user = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  const POOL_ADDRESS = new PublicKey(process.env.POOL_ADDRESS!);
  console.log("pool ka address", POOL_ADDRESS);

  const FAKE_MINT = new PublicKey(process.env.FAKE_MINT!);

  const goldMint = await getMint(connection, FAKE_MINT);

  const dlmmPool = await DLMM.create(connection, POOL_ADDRESS);
  const activeBin = await dlmmPool.getActiveBin();
  const TOTAL_RANGE_INTERVAL = 10; // 10 bins on each side of the active bin
  const minBinId = activeBin.binId;
  const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL * 2;

  const totalXAmount = new BN(0).mul(new BN(0).pow(new BN(goldMint.decimals))); // 10B tokens
  const totalYAmount = new BN(1_000_000_000);
  const newOneSidePosition = new Keypair();

  const createPositionTx =
    await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: newOneSidePosition.publicKey,
      user: user.publicKey,
      totalXAmount,
      totalYAmount,
      strategy: {
        maxBinId,
        minBinId,
        strategyType: StrategyType.Spot, // can be StrategyType.Spot, StrategyType.BidAsk, StrategyType.Curve
      },
    });
  const txSig = await sendAndConfirmTransaction(connection, createPositionTx, [
    user,
    newOneSidePosition
  ]);

  console.log(`$GOLD single-sided position created! Tx: ${txSig}`);
};

main().catch(console.error);