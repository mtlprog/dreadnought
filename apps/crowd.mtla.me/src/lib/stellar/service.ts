import { Effect, pipe, Context, Layer } from "effect"
import { Horizon } from "@stellar/stellar-sdk"
import { StellarError, StellarServiceError } from "./errors"
import { ProjectInfo, ProjectData } from "./types"
import { getStellarConfig } from "./config"
import { 
  fetchProjectDataFromIPFS, 
  isProjectExpired, 
  countUniqueSupporters, 
  calculateRaisedAmount 
} from "./utils"

export interface StellarService {
  readonly getProjects: () => Effect.Effect<ProjectInfo[], StellarServiceError>
}

export const StellarService = Context.GenericTag<StellarService>(
  "@crowd.mtla.me/StellarService"
)

const checkTokenExists = (server: Horizon.Server, publicKey: string, assetCode: string): Effect.Effect<boolean, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Check claimable balances for the token
        const claimableBalances = await server.claimableBalances()
          .sponsor(publicKey)
          .call()
        
        for (const balance of claimableBalances.records) {
          const asset = balance.asset
          if (asset !== "native" && asset.split(':')[0] === assetCode) {
            return true
          }
        }

        // Check account balances for the token
        try {
          const account = await server.loadAccount(publicKey)
          for (const balance of account.balances) {
            if (balance.asset_type !== "native" && 
                balance.asset_code === assetCode && 
                balance.asset_issuer === publicKey) {
              return true
            }
          }
        } catch {
          // Account might not exist or have the token, that's ok
        }
        
        return false
      },
      catch: (error) => new StellarError({ 
        cause: error, 
        operation: "check_token_exists" 
      })
    })
  )

const getClaimableBalances = (server: Horizon.Server, publicKey: string): Effect.Effect<any[], StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const claimableBalances = await server.claimableBalances()
          .sponsor(publicKey)
          .call()
        return claimableBalances.records
      },
      catch: (error) => new StellarError({ 
        cause: error, 
        operation: "get_claimable_balances" 
      })
    })
  )

export const StellarServiceLive = Layer.effect(
  StellarService,
  Effect.gen(function* () {
    return StellarService.of({
      getProjects: () => pipe(
        getStellarConfig(),
        Effect.flatMap(({ publicKey, server }) =>
          Effect.tryPromise({
            try: async () => {
              const account = await server.loadAccount(publicKey)
              return account.data_attr
            },
            catch: (error) => new StellarError({ 
              cause: error, 
              operation: "load_account" 
            })
          })
        ),
        Effect.flatMap(dataEntries => {
          const projectEntries = Object.entries(dataEntries)
            .filter(([key]) => key.startsWith('ipfshash-'))
            .map(([key, value]) => ({
              code: key.replace('ipfshash-', ''),
              cid: Buffer.from(value, 'base64').toString()
            }))

          return Effect.all(
            projectEntries.map(({ code, cid }) =>
              pipe(
                Effect.all([
                  fetchProjectDataFromIPFS(cid),
                  pipe(
                    getStellarConfig(),
                    Effect.flatMap(({ publicKey, server }) =>
                      checkTokenExists(server, publicKey, code)
                    )
                  ),
                  pipe(
                    getStellarConfig(),
                    Effect.flatMap(({ publicKey, server }) =>
                      getClaimableBalances(server, publicKey)
                    )
                  )
                ]),
                Effect.map(([projectData, tokenExists, claimableBalances]) => {
                  if (!tokenExists) {
                    return null // Skip projects without tokens
                  }

                  const supportersCount = countUniqueSupporters(claimableBalances, code)
                  const currentAmount = calculateRaisedAmount(claimableBalances, code)
                  const isExpired = isProjectExpired(projectData.deadline)
                  
                  const projectInfo: ProjectInfo = {
                    name: projectData.name,
                    code: projectData.code,
                    description: projectData.description,
                    contact_account_id: projectData.contact_account_id,
                    project_account_id: projectData.project_account_id,
                    target_amount: projectData.target_amount,
                    deadline: projectData.deadline,
                    current_amount: currentAmount,
                    supporters_count: supportersCount,
                    ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
                    status: isExpired ? "completed" : "active"
                  }

                  return projectInfo
                }),
                Effect.catchAll(() => Effect.succeed(null)) // Skip failed projects
              )
            ),
            { concurrency: "unbounded" }
          )
        }),
        Effect.map(projects => projects.filter((p): p is ProjectInfo => p !== null))
      )
    })
  })
)
