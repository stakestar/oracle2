import { JsonRpcProvider } from 'ethers';

const url = 'https://rpc.ankr.com/eth';
const rpc = new JsonRpcProvider(url);

rpc.getBlockNumber().then((value) => {
  console.log(`Block: ${value}`);
});

console.log(`token: ${process.env.NPM_TOKEN}`);
