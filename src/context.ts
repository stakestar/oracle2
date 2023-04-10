import { CONFIG, Config } from './utils.js';
import { providers, Wallet } from 'ethers';
import {
  ADDRESSES,
  StakeStarOracleStrict,
  StakeStarOracleStrict__factory,
  StakeStarRegistry,
  StakeStarRegistry__factory,
} from '@stakestar/contracts';
import * as lodestar from '@lodestar/api';
import {config} from "@lodestar/config/default";

class Contracts {
  public stakeStarOracleStrict: StakeStarOracleStrict;
  public stakeStarOracleRegistry: StakeStarRegistry;
}

export class Context {
  public beaconClient: lodestar.Api;
  public rpc: providers.JsonRpcProvider;
  public contracts: Contracts;
  public withdrawalAddress: string;
  public wallet: Wallet;

  private constructor(cfg: Config) {
    const rpc = cfg.ENDPOINT_EXECUTION;
    console.log(`Using ENDPOINT_EXECUTION: ${rpc}`);
    this.rpc = new providers.JsonRpcProvider(rpc);

    this.wallet = Wallet.fromMnemonic(cfg.MNEMONIC).connect(this.rpc);
    console.log(`Using wallet: ${this.wallet.address}`);

    const beacon_rpc = CONFIG.ENDPOINT_CONSENSUS;
    console.log(`Using ENDPOINT_CONSENSUS: ${beacon_rpc}`);
    this.beaconClient = lodestar.getClient({ baseUrl: beacon_rpc }, { config });

    const network = cfg.NETWORK;
    console.log(`Using NETWORK: ${network}`);
    const addresses = ADDRESSES[network];
    this.contracts = new Contracts();

    this.contracts.stakeStarOracleStrict = this.initContract(
      StakeStarOracleStrict__factory,
      addresses.stakeStarOracleStrict,
    );

    this.contracts.stakeStarOracleRegistry = this.initContract(
      StakeStarRegistry__factory,
      addresses.stakeStarRegistry,
    );

    this.withdrawalAddress = addresses.withdrawalAddress;
  }

  static init(config: Config) {
    return new Context(config);
  }

  private initContract(factory: any, address: string): any {
    const contract = factory.connect(address, this.wallet);
    console.log(`Initialized ${factory.name}, ${address}`);
    return contract;
  }
}
