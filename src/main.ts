import { CONFIG } from './utils.js';
import { Service } from './service.js';
import { Context } from './context.js';
import * as Sentry from '@sentry/node';

// check if already submitted
// 1. Get epoch stakestaroracleStrict (EL)
// 2. Withdrawal address balance from EL
// 3. Stakestarregistry (EL address) -> get validator PKS -> By validator PKS collect balance (CL)
// 4. Submit to StakestaroracleSrict strict (EL)

//todo
// response mapping based on fork (capella etc) for slot to block number

async function start() {
  Sentry.init({
    dsn: 'https://022d35cce92b4128933a0da831377af8@o774894.ingest.sentry.io/4505013018886144',

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });

  const context = Context.init(CONFIG);
  const service = new Service(context);

  const nextEpoch =
    await context.contracts.stakeStarOracleStrict.nextEpochToPublish();
  // const nextEpoch = 168300;
  console.log(`next epoch: ${nextEpoch}`);

  const finalizedEpoch = await service.getFinalizedEpoch();
  console.log(`Finalized epoch: ${finalizedEpoch}`);
  if (nextEpoch > finalizedEpoch) {
    console.log(
      `Next epoch not finalized yet. Next epoch: ${nextEpoch}, Finalized: ${finalizedEpoch}`,
    );
    return;
  }

  console.log(`Fetching last submitted epoch.`);
  const lastSubmittedEpoch = await service.getLastSubmittedEpoch();
  console.log(`last submitted epoch ${lastSubmittedEpoch}`);

  if (nextEpoch <= lastSubmittedEpoch) {
    console.log(`Required epoch data is already submitted`);
    return;
  }

  const slot = await service.epochToSlot(nextEpoch);
  console.log(`Epoch slot: ${slot}`);

  const blockNumber = await service.slotToBlockNumber(slot);
  console.log(`Epoch block: ${blockNumber}`);

  const pks = await service.fetchValidatorPks();
  console.log(`Validator pks:\n${pks}`);

  console.log(`Fetching balances`);
  const sum = await service.sumValidatorBalances(slot, pks);
  console.log(`Balances sum: ${sum}`);

  const withdrawalAddressBalance = await service.fetchELBalance(blockNumber);
  console.log(
    `withdrawal address balance: ${withdrawalAddressBalance.toString()}`,
  );

  const totalBalance = withdrawalAddressBalance.add(sum);
  console.log(`Total Balance: ${totalBalance}`);

  console.log(`Submitting balance`);
  const tx = await context.contracts.stakeStarOracleStrict.save(
    nextEpoch,
    totalBalance,
  );
  console.log(`Done: ${tx.hash}`);
}

(async () => {
  await start();
})();
