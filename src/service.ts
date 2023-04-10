import { Context } from './context';
import { BigNumber } from 'ethers';

export class Service {
  constructor(private context: Context) {}

  public async fetchValidatorPks() {
    const registry = this.context.contracts.stakeStarOracleRegistry;
    let offset = 0;
    const limit = 400;
    const keys: string[] = [];
    let stop = false;
    do {
      const strings = await registry['getValidatorPublicKeys(uint32,uint32)'](
        offset,
        limit,
      );

      const nonNullKeys = strings.filter((value) => value !== '0x');
      if (nonNullKeys.length === 0) {
        stop = true;
        break;
      }

      keys.push(...nonNullKeys);
      offset += limit;
    } while (!stop);
    return keys;
  }

  public async epochToSlot(nextEpoch: number) {
    console.log(`Fetching proposer duties`);
    // const duties = await handleError(() => {
    //   return context.beaconClient.validator.getProposerDuties(nextEpoch);
    // });
    // if (duties.length === 0) {
    //   throw Error('Empty duties list');
    // }

    const epochData = await this.context.beaconClient.beacon.getEpochCommittees(
      `finalized`,
      { epoch: nextEpoch, index: 0 },
    );
    for (const entry of epochData.response.data) {
      console.log(`Fetching block for slot: ${entry.slot}`);
      const block = await this.context.beaconClient.beacon.getBlockV2(
        entry.slot,
      );
      if (block.ok) {
        return entry.slot;
      } else {
        console.log(`Block not found`);
      }
    }

    throw Error('Cannot find slot for block');
  }

  // https://hackmd.io/ofFJ5gOmQpu1jjHilHbdQQ
  // https://www.quicknode.com/docs/ethereum/eth-v1-beacon-states-%7Bstate_id%7D-validators
  async sumValidatorBalances(slot: number, pks: string[]) {
    let sum = BigNumber.from(0);
    for (const pk of pks) {
      const state = await this.context.beaconClient.beacon.getStateValidator(
        slot,
        pk,
      );
      console.log(`Response ${pk}:\n${JSON.stringify(state.response)}`);

      let balance = BigNumber.from(0);

      if (state.ok) {
        balance = BigNumber.from(state.response.data.balance);
      } else {
        if (state.error.code === 404) {
          // not available on chain but pending in contract
          balance = BigNumber.from(32).mul(BigNumber.from(10).pow(9));
        } else {
          console.log(
            `Validator state retrieving error (slot${slot}, pk :${pk})\n${JSON.stringify(
              state.error,
            )}`,
          );
          continue;
        }
      }

      console.log(`slot:${slot}, validator${pk}, balance:${balance}, sum: ${sum}`);

      sum = sum.add(balance);
    }

    return sum.mul(BigNumber.from(10).pow(9));
  }

  async slotToBlockNumber(slot: number) {
    const block = await this.context.beaconClient.beacon.getBlockV2(slot);
    const blockNumber =
      block.response.data.message.body['executionPayload'].blockNumber;
    return blockNumber as number;
  }

  async fetchELBalance(blockNumber: number) {
    const address = this.context.withdrawalAddress;
    console.log(`Fetching withdrawal address balance: ${address}`);
    return this.context.rpc.getBalance(address, blockNumber);
  }

  async getFinalizedEpoch() {
    const stateFinalityCheckpoints =
      await this.context.beaconClient.beacon.getStateFinalityCheckpoints(
        'head',
      );
    if (!stateFinalityCheckpoints.ok) {
      throw Error(JSON.stringify(stateFinalityCheckpoints.error));
    }

    return stateFinalityCheckpoints.response.data.finalized.epoch;
  }

  async getLastSubmittedEpoch() {
    let lastEpoch = 0;
    const currentBlock = await this.context.rpc.getBlockNumber();
    const lastBlock = currentBlock - 22000; /// ~3 days

    console.log(`Searching txs from ${lastBlock}, to ${currentBlock} block`);
    const txs = await this.context.etherscanRpc.getHistory(
      this.context.wallet.address,
      lastBlock,
      currentBlock,
    );
    console.log(`Found ${txs.length} txs`);

    for (const tx of txs.reverse()) {
      const contract = this.context.contracts.stakeStarOracleStrict;
      if (tx.to === contract.address) {
        const txData = await contract.interface.parseTransaction({
          data: tx.data,
        });
        lastEpoch = txData.args[0];
        console.log(`Last submitted epoch: ${lastEpoch}, tx ${tx.hash}`);

        break;
      }
    }
    // const result =
    //   await this.context.contracts.stakeStarOracleStrict.getCurrentProposal(
    //     this.context.wallet.address,
    //   );
    return lastEpoch;
  }
}
