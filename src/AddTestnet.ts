// utils/keplr.ts
export const keplrChainInfos: Record<string, any> = {
  'rebel-2': {
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
  }
};

const UNSUPPORTED = ['rebel-2'];

export async function ensureChainAddedKeplr(chain: string) {
  if (!UNSUPPORTED.some((val, _i, _arr) => val === chain)) {
    return;
  }
  console.log("Ensuring Keplr chain is added: ", chain);
  if (!("keplr" in window)) throw new Error("Keplr nicht gefunden");
  try{
    if (!(window as any).keplr) {
      // silently ignore if Keplr not installed - fallback to WC
      return;
    }
    await (window.keplr as any).experimentalSuggestChain(keplrChainInfos[chain]);
    await (window.keplr as any).enable(chain);
  } catch{
    alert(`It was not possible to add and enable ${chain}`);
    console.error("Keplr nicht gefunden");
  }
}
