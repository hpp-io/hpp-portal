/**
 * Local cache for confirmed bridge transfers + helpers to merge with API history.
 */

export type BridgeHistoryRow = {
  l1TxHash: `0x${string}`;
  l2TxHash?: `0x${string}`;
  trackingId?: string;
  amount: string;
  fromToken: string;
  toToken: string;
  sourceNetwork: string;
  destinationNetwork: string;
  walletAddress: `0x${string}`;
  startedAt: number;
  updatedAt: number;
  status: 'success';
  l1GasFeeWei?: string;
  l1ApproveGasFeeWei?: string | null;
  l1TxValueWei?: string;
  l1MaxSubmissionCostWei?: string;
  l2GasFeeWei?: string;
};

const STORAGE_KEY = 'hpp_bridge_confirmed_history_v1';
const MAX_ROWS_PER_WALLET = 100;

type HistoryFile = Record<string, BridgeHistoryRow[]>;

function readFile(): HistoryFile {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as HistoryFile) : {};
  } catch {
    return {};
  }
}

function writeFile(file: HistoryFile) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  } catch {
    // quota / private mode
  }
}

export function loadBridgeHistoryCacheForWallet(walletAddressLower: string): BridgeHistoryRow[] {
  const file = readFile();
  const list = file[walletAddressLower];
  return Array.isArray(list) ? list : [];
}

export function upsertBridgeHistoryCacheForWallet(walletAddressLower: string, row: BridgeHistoryRow) {
  if (row.status !== 'success') return;
  const file = readFile();
  const prev = Array.isArray(file[walletAddressLower]) ? file[walletAddressLower] : [];
  const k = row.l1TxHash.toLowerCase();
  const without = prev.filter((r) => r.l1TxHash.toLowerCase() !== k);
  const next = [row, ...without].slice(0, MAX_ROWS_PER_WALLET);
  file[walletAddressLower] = next;
  writeFile(file);
}

export function mergeBridgeHistoryPrioritizeApi(apiRows: BridgeHistoryRow[], localRows: BridgeHistoryRow[]): BridgeHistoryRow[] {
  const definedEntries = (row: BridgeHistoryRow) =>
    Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)) as Partial<BridgeHistoryRow>;

  const map = new Map<string, BridgeHistoryRow>();
  for (const row of localRows) map.set(row.l1TxHash.toLowerCase(), { ...row });

  for (const row of apiRows) {
    const key = row.l1TxHash.toLowerCase();
    const base = map.get(key);
    const patch = definedEntries(row);
    map.set(key, base ? ({ ...base, ...patch } as BridgeHistoryRow) : ({ ...patch } as BridgeHistoryRow));
  }
  return [...map.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export async function fetchBridgeHistoryFromApi(apiBase: string, walletAddress: `0x${string}`): Promise<BridgeHistoryRow[]> {
  const url = `${apiBase.replace(/\/$/, '')}/bridge-tracking/history?walletAddress=${walletAddress}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];

  const out: BridgeHistoryRow[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Partial<BridgeHistoryRow> & { status?: string };
    const statusRaw = (row.status || '').toLowerCase();
    if (statusRaw !== 'success' && statusRaw !== 'confirmed' && statusRaw !== 'completed') continue;
    if (!row.l1TxHash || !row.walletAddress || row.amount == null) continue;
    out.push({
      l1TxHash: row.l1TxHash as `0x${string}`,
      l2TxHash: row.l2TxHash as `0x${string}` | undefined,
      trackingId: row.trackingId,
      amount: String(row.amount),
      fromToken: row.fromToken || 'Unknown',
      toToken: row.toToken || 'Unknown',
      sourceNetwork: row.sourceNetwork || 'Unknown',
      destinationNetwork: row.destinationNetwork || 'Unknown',
      walletAddress: row.walletAddress as `0x${string}`,
      startedAt: Number(row.startedAt || row.updatedAt || Date.now()),
      updatedAt: Number(row.updatedAt || row.startedAt || Date.now()),
      status: 'success',
      l1GasFeeWei: row.l1GasFeeWei,
      l1ApproveGasFeeWei: row.l1ApproveGasFeeWei ?? null,
      l1TxValueWei: row.l1TxValueWei,
      l1MaxSubmissionCostWei: row.l1MaxSubmissionCostWei,
      l2GasFeeWei: row.l2GasFeeWei,
    });
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}

