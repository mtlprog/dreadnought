#!/usr/bin/env bun

import { Command } from "commander"
import { Effect, pipe, Context, Layer } from "effect"
import { BunRuntime } from "@effect/platform-bun"
import * as S from "@effect/schema/Schema"
import chalk from "chalk"
import prompts from "prompts"
import { PinataSDK } from "pinata"
import { Keypair, Networks, TransactionBuilder, Operation, Asset, Claimant, TimeoutInfinite, Horizon } from "@stellar/stellar-sdk"

// Error types
export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  }
) {}

export class PinataError extends S.TaggedError<PinataError>()(
  "PinataError",
  {
    cause: S.Unknown,
    operation: S.String,
  }
) {}

export class StellarError extends S.TaggedError<StellarError>()(
  "StellarError",
  {
    cause: S.Unknown,
    operation: S.String,
  }
) {}

export class EnvironmentError extends S.TaggedError<EnvironmentError>()(
  "EnvironmentError",
  {
    variable: S.String,
  }
) {}

export type CliError = ValidationError | PinataError | StellarError | EnvironmentError

// Project data schema
export const ProjectData = S.Struct({
  name: S.String,
  code: S.String,
  description: S.String,
  contact_account_id: S.String,
  project_account_id: S.String,
  target_amount: S.String,
  deadline: S.String,
})
export type ProjectData = S.Schema.Type<typeof ProjectData>

// Services
export interface EnvironmentService {
  readonly getRequired: (key: string) => Effect.Effect<string, EnvironmentError>
  readonly getOptional: (key: string, defaultValue: string) => Effect.Effect<string, never>
}

export const EnvironmentService = Context.GenericTag<EnvironmentService>(
  "@crowd.mtla.me/EnvironmentService"
)

export interface PinataService {
  readonly upload: (data: ProjectData) => Effect.Effect<string, PinataError | EnvironmentError, EnvironmentService>
}

export const PinataService = Context.GenericTag<PinataService>(
  "@crowd.mtla.me/PinataService"
)

export interface StellarService {
  readonly createTransaction: (code: string, cid: string, projectAccountId: string) => Effect.Effect<string, StellarError | EnvironmentError, EnvironmentService>
}

export const StellarService = Context.GenericTag<StellarService>(
  "@crowd.mtla.me/StellarService"
)

// Service implementations
const EnvironmentServiceLive = Layer.succeed(
  EnvironmentService,
  EnvironmentService.of({
    getRequired: (key: string) => pipe(
      Effect.sync(() => process.env[key]),
      Effect.flatMap(value => 
        value 
          ? Effect.succeed(value)
          : Effect.fail(new EnvironmentError({ variable: key }))
      )
    ),
    
    getOptional: (key: string, defaultValue: string) => 
      Effect.sync(() => process.env[key] ?? defaultValue)
  })
)

const PinataServiceLive = Layer.succeed(
  PinataService,
  PinataService.of({
    upload: (data: ProjectData) => pipe(
      Effect.all([
        pipe(EnvironmentService, Effect.flatMap(env => env.getRequired("PINATA_TOKEN"))),
        pipe(EnvironmentService, Effect.flatMap(env => env.getRequired("PINATA_GROUP_ID")))
      ]),
      Effect.flatMap(([token, groupId]) =>
        Effect.tryPromise({
          try: async () => {
            const pinata = new PinataSDK({
              pinataJwt: token,
            })

            const result = await pinata.upload.public.json(data, {
              metadata: {
                name: `project-${data.code}`,
              },
              groupId,
            })

            return result.cid
          },
          catch: (error) => new PinataError({ 
            cause: error, 
            operation: "upload" 
          })
        })
      )
    )
  })
)

const StellarServiceLive = Layer.succeed(
  StellarService,
  StellarService.of({
    createTransaction: (code: string, cid: string, projectAccountId: string) => pipe(
      Effect.all([
        pipe(EnvironmentService, Effect.flatMap(env => env.getRequired("STELLAR_SEED"))),
        pipe(EnvironmentService, Effect.flatMap(env => env.getOptional("STELLAR_NETWORK", "testnet")))
      ]),
      Effect.flatMap(([seed, network]) =>
        Effect.tryPromise({
          try: async () => {
            const server = new Horizon.Server(
              network === "mainnet" 
                ? "https://horizon.stellar.org"
                : "https://horizon-testnet.stellar.org"
            )

            const sourceKeypair = Keypair.fromSecret(seed)
            const sourceAccount = await server.loadAccount(sourceKeypair.publicKey())

            const transaction = new TransactionBuilder(sourceAccount, {
              fee: "100",
              networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
            })
              .addOperation(Operation.manageData({
                name: `ipfshash-${code}`,
                value: cid,
              }))
              .addOperation(Operation.createClaimableBalance({
                asset: new Asset(code, sourceKeypair.publicKey()),
                amount: "0.0000001",
                claimants: [
                  new Claimant(sourceKeypair.publicKey()),
                  new Claimant(projectAccountId)
                ]
              }))
              .setTimeout(TimeoutInfinite)
              .build()

            transaction.sign(sourceKeypair)
            return transaction.toXDR()
          },
          catch: (error) => new StellarError({ 
            cause: error, 
            operation: "create_transaction" 
          })
        })
      )
    )
  })
)

// Main application logic
const validateProjectData = (data: unknown): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    S.decodeUnknown(ProjectData)(data),
    Effect.mapError(error => 
      new ValidationError({ 
        field: "project_data", 
        message: `Validation failed: ${error.message}` 
      })
    )
  )

const askQuestions = (): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: () => prompts([
        {
          type: "text",
          name: "name",
          message: "Название проекта:",
          validate: (value: string) => value.length > 0 ? true : "Название обязательно"
        },
        {
          type: "text", 
          name: "code",
          message: "Тикер:",
          validate: (value: string) => /^[A-Z0-9]{1,12}$/.test(value) ? true : "Тикер должен содержать только заглавные буквы и цифры (макс. 12 символов)"
        },
        {
          type: "text",
          name: "description", 
          message: "Описание проекта:",
          validate: (value: string) => value.length > 10 ? true : "Описание должно быть минимум 10 символов"
        },
        {
          type: "text",
          name: "contact_account_id",
          message: "Счет координатора проекта:",
          validate: (value: string) => /^G[A-Z2-7]{55}$/.test(value) ? true : "Неверный формат Stellar адреса"
        },
        {
          type: "text",
          name: "project_account_id",
          message: "Счет проекта:",
          validate: (value: string) => /^G[A-Z2-7]{55}$/.test(value) ? true : "Неверный формат Stellar адреса"
        },
        {
          type: "text",
          name: "target_amount",
          message: "Цель сбора:",
          validate: (value: string) => /^\d+(\.\d+)?$/.test(value) && parseFloat(value) > 0 ? true : "Введите положительное число"
        },
        {
          type: "text",
          name: "deadline",
          message: "Дедлайн (YYYY-MM-DD):",
          validate: (value: string) => {
            const date = new Date(value)
            return !isNaN(date.getTime()) && date > new Date() ? true : "Введите корректную дату в будущем"
          }
        }
      ]),
      catch: (error) => new ValidationError({ 
        field: "user_input", 
        message: `Failed to get user input: ${error}` 
      })
    }),
    Effect.flatMap(response => 
      Object.keys(response as object).length < 7
        ? Effect.fail(new ValidationError({ 
            field: "user_input", 
            message: "Operation cancelled" 
          }))
        : validateProjectData(response)
    )
  )

const createProject = (): Effect.Effect<void, CliError, EnvironmentService | PinataService | StellarService> =>
  pipe(
    Effect.gen(function* () {
      yield* Effect.sync(() => console.log(chalk.blue("🚀 Creating new project...\n")))

      // Check required environment variables first
      yield* Effect.sync(() => console.log(chalk.blue("🔍 Checking environment variables...")))
      const env = yield* EnvironmentService
      yield* env.getRequired("STELLAR_SEED")
      yield* env.getRequired("PINATA_TOKEN")
      yield* env.getRequired("PINATA_GROUP_ID")
      yield* Effect.sync(() => console.log(chalk.green("✅ Environment variables OK\n")))

      const projectData = yield* askQuestions()
      
      yield* Effect.sync(() => console.log(chalk.blue("\n📦 Uploading to IPFS...")))
      const cid = yield* pipe(
        PinataService,
        Effect.flatMap(service => service.upload(projectData))
      )
      yield* Effect.sync(() => console.log(chalk.green(`✅ IPFS CID: ${cid}`)))

      yield* Effect.sync(() => console.log(chalk.blue("\n🔗 Creating Stellar transaction...")))
      const transactionXDR = yield* pipe(
        StellarService,
        Effect.flatMap(service => service.createTransaction(
          projectData.code,
          cid,
          projectData.project_account_id
        ))
      )

      yield* Effect.sync(() => {
        console.log(chalk.green("\n✅ Project created successfully!"))
        console.log(chalk.cyan("IPFS CID:"), cid)
        console.log(chalk.cyan("Transaction XDR:"))
        console.log(chalk.white(transactionXDR))
      })
    }),
    Effect.catchAll((error: CliError) =>
      Effect.sync(() => {
        console.error(chalk.red("❌ Error:"), error)
        process.exit(1)
      })
    )
  )

const AppLayer = Layer.mergeAll(
  EnvironmentServiceLive,
  PinataServiceLive,
  StellarServiceLive
)

// CLI setup
const program = new Command()

program
  .name("crowd-cli")
  .description("CLI for Montelibero Crowdsourcing Platform")
  .version("1.0.0")

program
  .command("new-project")
  .description("Create a new project")
  .action(() => {
    const program = pipe(
      createProject(),
      Effect.provide(AppLayer)
    )
    
    BunRuntime.runMain(program)
  })

program.parse()