export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}`;

export const REPORT_PAYMENTS_ABI = [
  {
    type: "function",
    name: "payForReport",
    stateMutability: "payable",
    inputs: [{ name: "walletAnalyzed", type: "address" }],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    type: "function",
    name: "reportFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;
