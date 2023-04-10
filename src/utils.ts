import { config } from 'dotenv';
import { Network } from '@stakestar/contracts';
import { ApiClientResponse, HttpErrorCodes } from '@lodestar/api';

config();

export interface Config {
  NETWORK: Network;
  ENDPOINT_EXECUTION: string;
  ENDPOINT_CONSENSUS: string;
  MNEMONIC: string;
}

export const CONFIG: Config = (() => {
  const cfg: Config = {
    NETWORK: process.env.NETWORK as Network,
    ENDPOINT_EXECUTION: process.env.ENDPOINT_EXECUTION,
    ENDPOINT_CONSENSUS: process.env.ENDPOINT_CONSENSUS,
    MNEMONIC: process.env.MNEMONIC,
  };

  for (const [key, value] of Object.entries(cfg)) {
    if (!value) {
      throw Error(`Env ${key} undefined`);
    }
  }

  return cfg;
})();

export async function handleError<S, E extends HttpErrorCodes>(
  apiCall: () => Promise<ApiClientResponse<S, E>>,
) {
  let err;

  for (let i = 0; i < 3; i++) {
    const response = await apiCall();
    if (response.ok === true) {
      return response.response;
    } else {
      err = response.error;
      console.log(`Api error: ${JSON.stringify(err)}`);
    }
  }

  throw Error(`Api error: ${JSON.stringify(err)}`);
}
