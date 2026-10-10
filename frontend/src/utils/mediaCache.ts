/**
 * In-memory and session cache for uploaded video blobs.
 * Enables instant, ultra-smooth 60fps playback of newly uploaded media
 * while decentralized IPFS gateway replication catches up in the background.
 */

const blobMap = new Map<string, string>()

export const mediaCache = {
  set(key: string, blobUrl: string) {
    if (key && blobUrl) {
      blobMap.set(key, blobUrl)
    }
  },

  get(key: string | null | undefined): string | null {
    if (!key) return null
    return blobMap.get(key) || null
  },

  has(key: string | null | undefined): boolean {
    if (!key) return false
    return blobMap.has(key)
  },
}
