import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const botChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "968"),
  name: "BOT Chain Testnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.bohr.life"] },
  },
  blockExplorers: {
    default: {
      name: "BOTScan",
      url: process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://scan.bohr.life",
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [botChain],
  connectors: [injected()],
  transports: {
    [botChain.id]: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.bohr.life"),
  },
});
