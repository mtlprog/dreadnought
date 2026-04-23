import { Option } from "effect";

export interface BlockchainExplorer {
  readonly id: string;
  readonly label: string;
  readonly accountUrl: (accountId: string) => Option.Option<string>;
  readonly assetUrl: (assetCode: string, assetIssuer?: string) => Option.Option<string>;
}

export const STELLAR_EXPERT: BlockchainExplorer = {
  id: "stellar-expert",
  label: "stellar.expert",
  accountUrl: (accountId) =>
    Option.some(`https://stellar.expert/explorer/public/account/${accountId}`),
  assetUrl: (assetCode, assetIssuer?) =>
    assetCode === "XLM" || assetIssuer === undefined || assetIssuer === ""
      ? Option.some("https://stellar.expert/explorer/public/asset/XLM")
      : Option.some(`https://stellar.expert/explorer/public/asset/${assetCode}-${assetIssuer}`),
};

export const LORE_MTLPROG: BlockchainExplorer = {
  id: "lore",
  label: "lore.mtlprog.xyz",
  accountUrl: (accountId) =>
    Option.some(`https://lore.mtlprog.xyz/accounts/${accountId}`),
  assetUrl: (assetCode, assetIssuer?) =>
    assetCode === "XLM" || assetIssuer === undefined || assetIssuer === ""
      ? Option.none()
      : Option.some(`https://lore.mtlprog.xyz/tokens/${assetIssuer}/${assetCode}`),
};

export const EXPLORERS: readonly BlockchainExplorer[] = [LORE_MTLPROG, STELLAR_EXPERT];

const STORAGE_KEY = "stat-mtlf-blockchain-explorer";

const EXPLORER_MAP = new Map(EXPLORERS.map((e) => [e.id, e]));

export function loadExplorer(): BlockchainExplorer {
  if (typeof window === "undefined") return LORE_MTLPROG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored != null) {
      const found = EXPLORER_MAP.get(stored);
      if (found !== undefined) return found;
    }
  } catch {
    // localStorage inaccessible
  }
  return LORE_MTLPROG;
}

export function saveExplorer(explorerId: string): void {
  if (!EXPLORER_MAP.has(explorerId)) return;
  try {
    localStorage.setItem(STORAGE_KEY, explorerId);
  } catch {
    // localStorage inaccessible
  }
}
