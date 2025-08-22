import type { ChainInfo } from "@goblinhunt/cosmes/wallet";

const REBEL_FACTORY = 'terra1wkfz33ygkgq2akd9kmp7fzsstrwr9f0zcarnaka3mwf48xxvv64qz6dpvd'

export function addressEllipsis(address: string): string {
  const parts = address.split('1');
  if (parts.length !== 2 || parts[1].length < 8) return address;
  console.log("Ellipsis", address, parts);
  console.log("Ellipsis BLAAAA", parts[1].slice(0, 4), parts[1].slice(-5, -1));
  let str = `terra1${parts[1].slice(0, 4)}...${parts[1].slice(-5, -1)}`;
  console.log("Ellipsis Result", str);
  return `terra1...${parts[1].slice(-6, -1)}`;
}

export function fetchContractStateSmart(gameAddress: string, query: any): Promise<any> {

  let queryBase64 = btoa(JSON.stringify(query));
  let url = `https://rebel-lcd.luncgoblins.com/cosmwasm/wasm/v1/contract/${gameAddress}/smart/${queryBase64}`;
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(response => response.json())
    .then(data => data.data)
    .catch(error => {
      console.error("Error fetching contract state:", error);
      throw error;
    });

}

export function getFactoryAddr(chain: ChainInfo<string>) {

  if ( chain.chainId === 'rebel-2' ) {
    return REBEL_FACTORY;
  } else if ( chain.chainId === 'columbus-5') {
    return REBEL_FACTORY;
  }

  throw new Error

}

export interface GameInfo {
  board: string;
  players: string[];
  turn: "black" | "white";
  is_finished: boolean;
  winner: string;
}

export interface JoinableGame {
  id: string;
  opponent_color: "Black" | "White" | null,
  opponent: string,
  create_time: number,
}