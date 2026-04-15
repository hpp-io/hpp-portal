export type HppCoreConfig = {
  ui?: {
    /** Upper-bound minutes shown for L2 arrival estimate in the Bridge status tooltip. */
    l2ArrivalEtaMaxMinutes?: number;
  };
  chainInfo: {
    chainId: number;
    chainName: string;
    minL2BaseFee: number;
    networkFeeReceiver: `0x${string}`;
    infrastructureFeeCollector: `0x${string}`;
    batchPoster: `0x${string}`;
    staker: `0x${string}`;
    chainOwner: `0x${string}`;
  };
  coreContracts: {
    rollup: `0x${string}`;
    inbox: `0x${string}`;
    outbox: `0x${string}`;
    adminProxy: `0x${string}`;
    sequencerInbox: `0x${string}`;
    bridge: `0x${string}`;
    utils: string;
    validatorWalletCreator: `0x${string}`;
  };
  tokenBridgeContracts: {
    l2Contracts: {
      customGateway: `0x${string}`;
      multicall: `0x${string}`;
      proxyAdmin: `0x${string}`;
      router: `0x${string}`;
      standardGateway: `0x${string}`;
      weth: `0x${string}`;
      wethGateway: `0x${string}`;
    };
    l3Contracts: {
      customGateway: `0x${string}`;
      multicall: `0x${string}`;
      proxyAdmin: `0x${string}`;
      router: `0x${string}`;
      standardGateway: `0x${string}`;
      weth: `0x${string}`;
      wethGateway: `0x${string}`;
    };
  };
};

export const hppCore: { sepolia: HppCoreConfig; mainnet: HppCoreConfig | null } = {
  sepolia: {
    ui: {
      l2ArrivalEtaMaxMinutes: 5,
    },
    chainInfo: {
      minL2BaseFee: 10000000,
      networkFeeReceiver: '0x252431e84d5e22435a0c833c2220770c52f59633',
      infrastructureFeeCollector: '0x252431e84d5e22435a0c833c2220770c52f59633',
      batchPoster: '0x7A0cfdCF4Dfb4d2007c435E437dd5356D585dc3F',
      staker: '0x7Df9e7904e5f419BAF29C31C2DF1F2C8EEd0214e',
      chainOwner: '0x3324DC1E72Ee0C0D0483503B5d36A592bfC862D9',
      chainName: 'conduit-orbit-deployer',
      chainId: 181228,
    },
    coreContracts: {
      rollup: '0x537F6A3606cb000aE568005bebAF8bd1Ea2DE3b6',
      inbox: '0xAAD45a7bF65b43E56767CdE3Ab84A5433c714Afc',
      outbox: '0x781Fc2C8EAeA5DFBa4E40A2487187C70703BD92C',
      adminProxy: '0xeFe31dAb50adDe5F29219dFa4604332df72A3823',
      sequencerInbox: '0x7A6398deA2adc6fe4A3cfBA3352840bB03e440d3',
      bridge: '0x1DDe0F57E7889B6866505634E58E3057b01dfed0',
      utils: '',
      validatorWalletCreator: '0x684A827456373a0C0379B1C82BA31Ee5E4F88F62',
    },
    tokenBridgeContracts: {
      l2Contracts: {
        customGateway: '0x1070D76B89D5dfCd30c56429202bd3dAE4d55955',
        multicall: '0x73465577E9FD7Cd585E4270F23A9eBa99B92b6eD',
        proxyAdmin: '0x0000000000000000000000000000000000000000',
        router: '0x8deBBE23AAE151C49609A46ad2b14590e3692F21',
        standardGateway: '0x15C7018696e1bDc392C252a28E0accD429D85b3E',
        weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        wethGateway: '0xbB0c4391ACBA1e218feE5aD156fA661eBff5545B',
      },
      l3Contracts: {
        customGateway: '0x8980cbD2EAF1F2aBb930889Fbbbe2b3837140cc5',
        multicall: '0xc7da6827dA3c2e8a41625eb2986a1c9D0515fD9d',
        proxyAdmin: '0xd79c083CCB59F1E232CE981875653344a2dfFf0d',
        router: '0xb3D7425f7A8dD31EF83d3fAE08302b7f9058E978',
        standardGateway: '0x4B39dEc9fBebE71902232be6129C123f10a732A6',
        weth: '0xd96a3b90e8AbF45E758BA7a407B3f2d1a3b6f546',
        wethGateway: '0xE57Bfe64Ee4e0A5A32329A75c7aC98b1c7664187',
      },
    },
  },
  mainnet: null,
};

