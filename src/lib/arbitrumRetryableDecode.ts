import { decodeAbiParameters, decodeFunctionData, type Hex } from 'viem';

const createRetryableTicketAbi = [
  {
    type: 'function',
    name: 'createRetryableTicket',
    stateMutability: 'payable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'l2CallValue', type: 'uint256' },
      { name: 'maxSubmissionCost', type: 'uint256' },
      { name: 'excessFeeRefundAddress', type: 'address' },
      { name: 'callValueRefundAddress', type: 'address' },
      { name: 'gasLimit', type: 'uint256' },
      { name: 'maxFeePerGas', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ type: 'uint256', name: '' }],
  },
] as const;

const l1GatewayRouterAbi = [
  {
    type: 'function',
    name: 'outboundTransfer',
    stateMutability: 'payable',
    inputs: [
      { name: '_token', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_maxGas', type: 'uint256' },
      { name: '_gasPriceBid', type: 'uint256' },
      { name: '_data', type: 'bytes' },
    ],
    outputs: [{ type: 'bytes', name: '' }],
  },
  {
    type: 'function',
    name: 'outboundTransferCustomRefund',
    stateMutability: 'payable',
    inputs: [
      { name: '_token', type: 'address' },
      { name: '_refundTo', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_maxGas', type: 'uint256' },
      { name: '_gasPriceBid', type: 'uint256' },
      { name: '_data', type: 'bytes' },
    ],
    outputs: [{ type: 'bytes', name: '' }],
  },
] as const;

const INBOX_MESSAGE_DELIVERED_TOPIC0 =
  '0xff64905f73a67fb594e0f940a8075a860db489ad991e032f48c81123eb52d60b' as const;

export type DecodedRetryableTicket = {
  maxSubmissionCost: bigint;
  l2CallValue: bigint;
};

export function tryDecodeCreateRetryableTicket(input: Hex | undefined): DecodedRetryableTicket | null {
  if (!input || input === '0x' || input.length < 10) return null;
  try {
    const decoded = decodeFunctionData({ abi: createRetryableTicketAbi, data: input });
    if (decoded.functionName !== 'createRetryableTicket') return null;
    const [, l2CallValue, maxSubmissionCost] = decoded.args;
    return { l2CallValue, maxSubmissionCost };
  } catch {
    try {
      const decodedRouter = decodeFunctionData({ abi: l1GatewayRouterAbi, data: input });
      const fn = decodedRouter.functionName;
      if (fn !== 'outboundTransfer' && fn !== 'outboundTransferCustomRefund') return null;
      const packed = decodedRouter.args[decodedRouter.args.length - 1];
      if (typeof packed !== 'string' || !packed.startsWith('0x')) return null;
      const [maxSubmissionCost] = decodeAbiParameters(
        [{ type: 'uint256', name: 'maxSubmissionCost' }, { type: 'bytes', name: 'extraData' }],
        packed,
      );
      return { l2CallValue: BigInt(0), maxSubmissionCost };
    } catch {
      return null;
    }
  }
}

export function tryDecodeRetryableTicketFromInboxLogs(
  logs: ReadonlyArray<{ topics: readonly Hex[]; data: Hex }> | undefined,
): DecodedRetryableTicket | null {
  if (!logs?.length) return null;
  for (const log of logs) {
    try {
      if (!log.topics?.length || log.topics[0]?.toLowerCase() !== INBOX_MESSAGE_DELIVERED_TOPIC0) continue;
      const [payload] = decodeAbiParameters([{ type: 'bytes', name: 'data' }], log.data);
      if (typeof payload !== 'string' || !payload.startsWith('0x')) continue;
      const [, l2CallValue, maxSubmissionCost] = decodeAbiParameters(
        [
          { type: 'address', name: 'to' },
          { type: 'uint256', name: 'l2CallValue' },
          { type: 'uint256', name: 'maxSubmissionCost' },
          { type: 'address', name: 'excessFeeRefundAddress' },
          { type: 'address', name: 'callValueRefundAddress' },
          { type: 'uint256', name: 'gasLimit' },
          { type: 'uint256', name: 'maxFeePerGas' },
          { type: 'bytes', name: 'data' },
        ],
        payload,
      );
      return { l2CallValue, maxSubmissionCost };
    } catch {
      // Ignore non-matching logs.
    }
  }
  return null;
}

