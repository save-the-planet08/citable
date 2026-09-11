// The wallet, by hand.
//
// No wagmi, no connect-kit, no modal library. This app has exactly one write call on one
// chain, and a connector framework would be more code than the thing it connects. EIP-1193
// is what every injected wallet speaks, and viem talks to it directly.
import { createWalletClient, custom, type Address, type EIP1193Provider, type WalletClient } from "viem";
import { sepolia } from "viem/chains";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export class WalletError extends Error {}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && window.ethereum !== undefined;
}

/**
 * Asks for an account and makes sure it is on Sepolia.
 *
 * The chain check is not politeness. Sent to mainnet this transaction would either fail or
 * — worse — succeed against a contract that is not this one, and the author would believe
 * they had registered something.
 */
export async function connect(): Promise<{ client: WalletClient; address: Address }> {
  const provider = window.ethereum;
  if (!provider) {
    throw new WalletError("No wallet found in this browser. MetaMask or Rabby will do.");
  }

  const [address] = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
  if (!address) throw new WalletError("The wallet returned no account.");

  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (parseInt(chainId, 16) !== sepolia.id) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${sepolia.id.toString(16)}` }],
      });
    } catch {
      throw new WalletError(
        `This registry lives on Sepolia. Your wallet is on chain ${parseInt(chainId, 16)} and did not switch.`,
      );
    }
  }

  return {
    client: createWalletClient({ account: address, chain: sepolia, transport: custom(provider) }),
    address,
  };
}
