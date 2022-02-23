import { InjectedConnector } from "@web3-react/injected-connector";

function createInjectedMetaMaskProvider() {
  return new InjectedConnector({
  // mainnet, ropsten, rinkeby, goerli, kovan
    // see: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    supportedChainIds: [1, 3, 4, 5, 42],
  })
}

function createInjectedTallyProvider() {
  return new InjectedConnector({
    // currently tally supports only mainnet
    // see: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    supportedChainIds: [1],
  })
}

export const injectedMetaMaskProvider = createInjectedMetaMaskProvider()
export const injectedTallyProvider = createInjectedTallyProvider()