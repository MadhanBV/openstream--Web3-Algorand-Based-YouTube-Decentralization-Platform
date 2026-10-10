import { PeraWalletConnect } from '@perawallet/connect'
import algosdk from 'algosdk'

// Algorand TestNet Chain ID

const ALGORAND_TESTNET_CHAIN_ID = 416002

// Configurable Algorand TestNet Public Node / Indexer API
const ALGORAND_NODE_URL =
  import.meta.env.VITE_ALGORAND_NODE_URL || 'https://testnet-api.algonode.cloud'

class PeraWalletService {
  private peraWallet: PeraWalletConnect
  private disconnectListeners: Set<() => void> = new Set()

  constructor() {
    this.peraWallet = new PeraWalletConnect({
      chainId: ALGORAND_TESTNET_CHAIN_ID,
      shouldShowSignTxnToast: true,
    })
  }

  /**
   * Initializes or reconnects to an existing Pera Wallet session.
   * Returns the connected Algorand address if an active session exists.
   */
  async reconnectWallet(): Promise<string | null> {
    try {
      const accounts = await this.peraWallet.reconnectSession()
      if (accounts && accounts.length > 0) {
        this.attachDisconnectListener()
        return accounts[0]
      }
      return null
    } catch (error) {
      console.warn('Pera Wallet session reconnect failed or expired:', error)
      return null
    }
  }

  /**
   * Launches the official Pera Wallet QR code / Web connection flow.
   * Prompts the user to approve the session in the Pera mobile app.
   */
  async connectWallet(): Promise<string> {
    try {
      const accounts = await this.peraWallet.connect()
      if (!accounts || accounts.length === 0) {
        throw new Error('No Algorand account was selected in Pera Wallet.')
      }
      this.attachDisconnectListener()
      return accounts[0]
    } catch (error: any) {
      if (error?.data?.type === 'CONNECT_MODAL_CLOSED' || error?.message?.includes('closed')) {
        throw new Error('Wallet connection was cancelled.')
      }
      throw error
    }
  }

  /**
   * Disconnects the current Pera Wallet session and clears listeners.
   */
  async disconnectWallet(): Promise<void> {
    try {
      await this.peraWallet.disconnect()
    } catch (error) {
      console.warn('Error during Pera Wallet disconnect:', error)
    } finally {
      this.notifyDisconnect()
    }
  }

  /**
   * Fetches the real on-chain ALGO balance from Algorand TestNet node.
   * Converts microALGOs to standard ALGOs (1 ALGO = 1,000,000 microALGO).
   */
  async fetchAccountBalance(address: string): Promise<number> {
    if (!address || address.length !== 58) {
      return 0
    }
    try {
      const response = await fetch(`${ALGORAND_NODE_URL}/v2/accounts/${address}`, {
        headers: { Accept: 'application/json' },
      })

      if (response.status === 404) {
        // Unfunded newly generated account on TestNet has 0 balance
        return 0
      }

      if (!response.ok) {
        throw new Error(`Algorand node returned status ${response.status}`)
      }

      const data = await response.json()
      const microAlgo = data.amount || 0
      return microAlgo / 1_000_000
    } catch (error) {
      console.warn(`Could not fetch TestNet balance for ${address}:`, error)
      return 0
    }
  }

  /**
   * Cryptographically signs an authentication challenge using Pera Wallet.
   * Prompts the user to sign an offline 0-ALGO proof transaction (never broadcasted).
   */
  async signAuthChallenge(
    address: string,
    challengeText: string,
  ): Promise<{ signedTxn?: string; signature?: string }> {
    try {
      // 1. Obtain suggested transaction parameters from Algorand TestNet
      let firstRound = 100
      let lastRound = 1100
      let genesisHashB64 = 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOxo='
      let genesisID = 'testnet-v1.0'

      try {
        const spRes = await fetch(`${ALGORAND_NODE_URL}/v2/transactions/params`, {
          headers: { Accept: 'application/json' },
        })
        if (spRes.ok) {
          const spData = await spRes.json()
          firstRound = spData['last-round'] || 100
          lastRound = firstRound + 1000
          genesisHashB64 = spData['genesis-hash'] || genesisHashB64
          genesisID = spData['genesis-id'] || genesisID
        }
      } catch (err) {
        console.warn('Using default TestNet parameters for offline proof:', err)
      }

      // Convert base64 genesis hash to Uint8Array
      const binaryGh = window.atob(genesisHashB64)
      const genesisHashBytes = new Uint8Array(binaryGh.length)
      for (let i = 0; i < binaryGh.length; i++) {
        genesisHashBytes[i] = binaryGh.charCodeAt(i)
      }

      const params = {
        fee: 1000,
        minFee: 1000,
        firstValid: firstRound,
        lastValid: lastRound,
        genesisHash: genesisHashBytes,
        genesisID: genesisID,
        flatFee: true,
      }

      // 2. Build 0-ALGO payment transaction to self with challenge note
      const enc = new TextEncoder()
      const noteBytes = enc.encode(challengeText)

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: address,
        amount: 0,
        note: noteBytes,
        suggestedParams: params,
      })

      // 3. Request signature from Pera Wallet
      const signedTxns = await this.peraWallet.signTransaction([
        [{ txn, signers: [address] }],
      ])

      if (!signedTxns || signedTxns.length === 0 || !signedTxns[0]) {
        throw new Error('No signed transaction was returned by Pera Wallet.')
      }

      // 4. Encode signed transaction bytes to Base64
      const signedBytes = signedTxns[0]
      let binary = ''
      for (let i = 0; i < signedBytes.byteLength; i++) {
        binary += String.fromCharCode(signedBytes[i])
      }
      const signedTxnBase64 = window.btoa(binary)

      return { signedTxn: signedTxnBase64 }
    } catch (error: any) {
      if (
        error?.data?.type === 'SIGN_TXN_CANCELLED' ||
        error?.message?.includes('cancel') ||
        error?.message?.includes('rejected')
      ) {
        throw new Error('Wallet signature request was cancelled or rejected by user.')
      }
      throw error
    }
  }

  /**
   * Registers a callback listener for mobile app session disconnects.
   */
  onDisconnect(callback: () => void): () => void {
    this.disconnectListeners.add(callback)
    return () => {
      this.disconnectListeners.delete(callback)
    }
  }

  private attachDisconnectListener() {
    try {
      this.peraWallet.connector?.on('disconnect', () => {
        this.notifyDisconnect()
      })
    } catch (e) {
      console.warn('Could not attach Pera connector disconnect listener:', e)
    }
  }

  private notifyDisconnect() {
    this.disconnectListeners.forEach((cb) => {
      try {
        cb()
      } catch (err) {
        console.warn('Error in disconnect listener:', err)
      }
    })
  }

  /**
   * Formats a 58-character Algorand address for UI display (e.g. 7K34...0491).
   */
  formatAddress(address: string | null | undefined): string {
    if (!address) return ''
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
}

export const peraWalletService = new PeraWalletService()

