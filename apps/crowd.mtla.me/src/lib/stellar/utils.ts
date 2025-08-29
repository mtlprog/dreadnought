import { Effect, pipe } from "effect"
import { StellarError } from "./errors"
import { ProjectData } from "./types"

/**
 * Fetch project data from IPFS using CID
 */
export const fetchProjectDataFromIPFS = (cid: string): Effect.Effect<ProjectData, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const ipfsUrl = `https://ipfs.io/ipfs/${cid}`
        const response = await fetch(ipfsUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return await response.json() as ProjectData
      },
      catch: (error) => new StellarError({ 
        cause: error, 
        operation: "fetch_ipfs_data" 
      })
    })
  )

/**
 * Check if a project deadline has expired
 */
export const isProjectExpired = (deadline: string): boolean => {
  const deadlineDate = new Date(deadline)
  return deadlineDate <= new Date()
}

/**
 * Count unique supporters from claimable balances
 */
export const countUniqueSupporters = (claimableBalances: any[], assetCode: string): number => {
  const uniqueSponsors = new Set<string>()
  
  for (const balance of claimableBalances) {
    const asset = balance.asset
    if (asset !== "native" && asset.split(':')[0] === `C-${assetCode}`) {
      uniqueSponsors.add(balance.sponsor)
    }
  }
  
  return uniqueSponsors.size
}

/**
 * Calculate total amount raised from claimable balances
 */
export const calculateRaisedAmount = (claimableBalances: any[], assetCode: string): string => {
  let totalAmount = 0
  
  for (const balance of claimableBalances) {
    const asset = balance.asset
    if (asset !== "native" && asset.split(':')[0] === `C-${assetCode}`) {
      totalAmount += parseFloat(balance.amount)
    }
  }
  
  return totalAmount.toString()
}
