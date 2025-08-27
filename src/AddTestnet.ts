// utils/keplr.ts
export const rebelChain = {
  chainId: "rebel-2",
  chainName: "Terra Classic Testnet",
  rpc: "https://rebel-rpc.luncgoblins.com",
  rest: "https://rebel-lcd.luncgoblins.com",
  bip44: { coinType: 330 },
  bech32Config: {
    bech32PrefixAccAddr: "terra",
    bech32PrefixAccPub: "terrapub",
    bech32PrefixValAddr: "terravaloper",
    bech32PrefixValPub: "terravaloperpub",
    bech32PrefixConsAddr: "terravalcons",
    bech32PrefixConsPub: "terravalconspub",
  },
  currencies: [
    { coinDenom: "LUNC", coinMinimalDenom: "uluna", coinDecimals: 6 },
  ],
  feeCurrencies: [
    {
      coinDenom: "LUNC",
      coinMinimalDenom: "uluna",
      coinDecimals: 6,
      gasPriceStep: { low: 29, average: 29, high: 29 },
    },
  ],
  stakeCurrency: { coinDenom: "LUNC", coinMinimalDenom: "uluna", coinDecimals: 6 },
  features: ["terra-classic-fee", "ibc-transfer", "cosmwasm"],   // falls zutreffend
} as const;

export async function ensureChainAddedKeplr(chain = rebelChain) {
    console.log("Ensuring Keplr chain is added: ", chain.chainId);
    if (!("keplr" in window)) throw new Error("Keplr nicht gefunden");
    await (window.keplr as any).experimentalSuggestChain(chain);
    await (window.keplr as any).enable(chain.chainId);
}
