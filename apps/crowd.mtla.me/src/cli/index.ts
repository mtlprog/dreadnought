#!/usr/bin/env bun

import { type CliProjectInfo, type ProjectData, ProjectDataSchema } from "@/lib/stellar/types";
import { BunRuntime } from "@effect/platform-bun";
import * as S from "@effect/schema/Schema";
import {
  Asset,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TimeoutInfinite,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import chalk from "chalk";
import { Command } from "commander";
import { Context, Effect, Layer, pipe } from "effect";
import { PinataSDK } from "pinata";
import prompts from "prompts";

// Error types
export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  },
) {}

export class PinataError extends S.TaggedError<PinataError>()(
  "PinataError",
  {
    cause: S.Unknown,
    operation: S.String,
  },
) {}

export class StellarError extends S.TaggedError<StellarError>()(
  "StellarError",
  {
    cause: S.Unknown,
    operation: S.String,
  },
) {}

export class EnvironmentError extends S.TaggedError<EnvironmentError>()(
  "EnvironmentError",
  {
    variable: S.String,
  },
) {}

export type CliError = ValidationError | PinataError | StellarError | EnvironmentError;

// Services
export interface EnvironmentService {
  readonly getRequired: (key: Readonly<string>) => Effect.Effect<string, EnvironmentError>;
  readonly getOptional: (key: Readonly<string>, defaultValue: Readonly<string>) => Effect.Effect<string, never>;
}

export const EnvironmentServiceCli = Context.GenericTag<EnvironmentService>(
  "@crowd.mtla.me/cli/EnvironmentService",
);

export interface PinataService {
  readonly upload: (
    data: Readonly<ProjectData>,
  ) => Effect.Effect<string, PinataError | EnvironmentError, EnvironmentService>;
}

export const PinataServiceCli = Context.GenericTag<PinataService>(
  "@crowd.mtla.me/cli/PinataService",
);

export interface StellarService {
  readonly createTransaction: (
    code: Readonly<string>,
    cid: Readonly<string>,
    projectAccountId: Readonly<string>,
  ) => Effect.Effect<string, StellarError | EnvironmentError, EnvironmentService>;
  readonly listProjects: () => Effect.Effect<
    CliProjectInfo[],
    StellarError | EnvironmentError | ValidationError,
    EnvironmentService
  >;
}

export const StellarServiceCli = Context.GenericTag<StellarService>(
  "@crowd.mtla.me/cli/StellarService",
);

// Service implementations
const EnvironmentServiceLive = Layer.succeed(
  EnvironmentServiceCli,
  EnvironmentServiceCli.of({
    getRequired: (key: Readonly<string>) =>
      pipe(
        Effect.sync(() => process.env[key]),
        Effect.flatMap(value =>
          value !== undefined && value !== ""
            ? Effect.succeed(value)
            : Effect.fail(new EnvironmentError({ variable: key }))
        ),
      ),

    getOptional: (key: Readonly<string>, defaultValue: Readonly<string>) =>
      Effect.sync(() => process.env[key] ?? defaultValue),
  }),
);

const PinataServiceLive = Layer.succeed(
  PinataServiceCli,
  PinataServiceCli.of({
    upload: (data: Readonly<ProjectData>) =>
      pipe(
        Effect.all([
          pipe(EnvironmentServiceCli, Effect.flatMap(env => env.getRequired("PINATA_TOKEN"))),
          pipe(EnvironmentServiceCli, Effect.flatMap(env => env.getRequired("PINATA_GROUP_ID"))),
        ]),
        Effect.flatMap(([token, groupId]) =>
          Effect.tryPromise({
            try: async () => {
              const pinata = new PinataSDK({
                pinataJwt: token,
              });

              const result = await pinata.upload.public.json(data, {
                metadata: {
                  name: `project-${data.code}`,
                },
                groupId,
              });

              return result.cid;
            },
            catch: (error) =>
              new PinataError({
                cause: error,
                operation: "upload",
              }),
          })
        ),
      ),
  }),
);

// Shared Stellar utilities
const getStellarConfig = () =>
  pipe(
    Effect.all([
      pipe(EnvironmentServiceCli, Effect.flatMap(env => env.getRequired("STELLAR_SEED"))),
      pipe(EnvironmentServiceCli, Effect.flatMap(env => env.getOptional("STELLAR_NETWORK", "testnet"))),
    ]),
    Effect.map(([seed, network]) => ({
      seed,
      network,
      keypair: Keypair.fromSecret(seed),
      server: new Horizon.Server(
        network === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org",
      ),
      networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    })),
  );

const fetchProjectDataFromIPFS = (
  cid: Readonly<string>,
): Effect.Effect<ProjectData, StellarError | ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
        const response = await fetch(ipfsUrl);
        return await response.json();
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "fetch_ipfs_data",
        }),
    }),
    Effect.flatMap(data =>
      pipe(
        S.decodeUnknown(ProjectDataSchema)(data),
        Effect.mapError(error =>
          new ValidationError({
            field: "ipfs_data",
            message: `Invalid IPFS data: ${error.message}`,
          })
        ),
      )
    ),
  );

const checkClaimableBalanceStatus = (
  server: Readonly<Horizon.Server>,
  sponsorKey: Readonly<string>,
  assetCode: Readonly<string>,
): Effect.Effect<"claimed" | "claimable", StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const claimableBalances = await server.claimableBalances()
          .sponsor(sponsorKey)
          .call();

        for (const balance of claimableBalances.records) {
          const asset = balance.asset;
          if (asset !== "native" && asset.split(":")[0] === assetCode) {
            return "claimable" as const;
          }
        }
        return "claimed" as const;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "check_claimable_balance",
        }),
    }),
  );

const StellarServiceLive = Layer.succeed(
  StellarServiceCli,
  StellarServiceCli.of({
    createTransaction: (code: Readonly<string>, cid: Readonly<string>, projectAccountId: Readonly<string>) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap(({ keypair, server, networkPassphrase }) =>
          Effect.tryPromise({
            try: async () => {
              const sourceAccount = await server.loadAccount(keypair.publicKey());

              const transaction = new TransactionBuilder(sourceAccount, {
                fee: "100",
                networkPassphrase,
              })
                .addOperation(Operation.manageData({
                  name: `ipfshash-${code}`,
                  value: cid,
                }))
                .addOperation(Operation.createClaimableBalance({
                  asset: new Asset(code, keypair.publicKey()),
                  amount: "0.0000001",
                  claimants: [
                    new Claimant(keypair.publicKey()),
                    new Claimant(projectAccountId),
                  ],
                }))
                .setTimeout(TimeoutInfinite)
                .build();

              transaction.sign(keypair);
              return transaction.toXDR();
            },
            catch: (error) =>
              new StellarError({
                cause: error,
                operation: "create_transaction",
              }),
          })
        ),
      ),

    listProjects: () =>
      pipe(
        getStellarConfig(),
        Effect.flatMap(({ keypair, server }) =>
          Effect.tryPromise({
            try: async () => {
              const account = await server.loadAccount(keypair.publicKey());
              return account.data_attr;
            },
            catch: (error) =>
              new StellarError({
                cause: error,
                operation: "load_account",
              }),
          })
        ),
        Effect.flatMap((dataEntries: Readonly<Record<string, string>>) =>
          Effect.all(
            Object.entries(dataEntries)
              .filter(([key]: readonly [string, string]) => key.startsWith("ipfshash-"))
              .map(([key, value]: readonly [string, string]) => {
                const code = key.replace("ipfshash-", "");
                const cid = Buffer.from(value, "base64").toString();
                const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;

                return pipe(
                  Effect.all([
                    fetchProjectDataFromIPFS(cid),
                    pipe(
                      getStellarConfig(),
                      Effect.flatMap(({ server, keypair }) =>
                        checkClaimableBalanceStatus(server, keypair.publicKey(), code)
                      ),
                    ),
                  ]),
                  Effect.map(([projectData, status]: readonly [ProjectData, "claimed" | "claimable"]) => ({
                    ...projectData,
                    ipfsUrl,
                    status,
                  })),
                );
              }),
            { concurrency: "unbounded" },
          )
        ),
      ),
  }),
);

// Main application logic
const validateProjectData = (data: Readonly<unknown>): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    S.decodeUnknown(ProjectDataSchema)(data),
    Effect.mapError(error =>
      new ValidationError({
        field: "project_data",
        message: `Validation failed: ${error.message}`,
      })
    ),
  );

const askQuestions = (): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        prompts([
          {
            type: "text",
            name: "name",
            message: "Название проекта:",
            validate: (value: string) => value.length > 0 ? true : "Название обязательно",
          },
          {
            type: "text",
            name: "code",
            message: "Тикер:",
            validate: (value: string) =>
              /^[A-Z0-9]{1,12}$/.test(value)
                ? true
                : "Тикер должен содержать только заглавные буквы и цифры (макс. 12 символов)",
          },
          {
            type: "text",
            name: "description",
            message: "Описание проекта:",
            validate: (value: string) => value.length > 10 ? true : "Описание должно быть минимум 10 символов",
          },
          {
            type: "text",
            name: "contact_account_id",
            message: "Счет координатора проекта:",
            validate: (value: string) => /^G[A-Z2-7]{55}$/.test(value) ? true : "Неверный формат Stellar адреса",
          },
          {
            type: "text",
            name: "project_account_id",
            message: "Счет проекта:",
            validate: (value: string) => /^G[A-Z2-7]{55}$/.test(value) ? true : "Неверный формат Stellar адреса",
          },
          {
            type: "text",
            name: "target_amount",
            message: "Цель сбора:",
            validate: (value: string) =>
              /^\d+(\.\d+)?$/.test(value) && parseFloat(value) > 0 ? true : "Введите положительное число",
          },
          {
            type: "text",
            name: "deadline",
            message: "Дедлайн (YYYY-MM-DD):",
            validate: (value: string) => {
              const date = new Date(value);
              return !isNaN(date.getTime()) && date > new Date() ? true : "Введите корректную дату в будущем";
            },
          },
        ]),
      catch: (error) =>
        new ValidationError({
          field: "user_input",
          message: `Failed to get user input: ${error}`,
        }),
    }),
    Effect.flatMap(response =>
      Object.keys(response as object).length < 7
        ? Effect.fail(
          new ValidationError({
            field: "user_input",
            message: "Operation cancelled",
          }),
        )
        : validateProjectData(response)
    ),
  );

// Shared environment validation
const checkEnvironmentVariables = (
  requiredVars: readonly string[],
): Effect.Effect<void, EnvironmentError, EnvironmentService> =>
  pipe(
    Effect.logInfo(chalk.blue("🔍 Checking environment variables...")),
    Effect.flatMap(() => EnvironmentServiceCli),
    Effect.flatMap(env =>
      Effect.all(
        requiredVars.map((varName: Readonly<string>) => env.getRequired(varName)),
        { concurrency: "unbounded" },
      )
    ),
    Effect.flatMap(() => Effect.logInfo(chalk.green("✅ Environment variables OK\n"))),
  );

// Shared error handling
const handleCliError = (error: Readonly<CliError>): Effect.Effect<void, never> =>
  pipe(
    Effect.logError(chalk.red("❌ Error:"), error),
    Effect.flatMap(() => Effect.sync(() => process.exit(1))),
  );

const createProject = (): Effect.Effect<void, CliError, EnvironmentService | PinataService | StellarService> =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.logInfo(chalk.blue("🚀 Creating new project...\n"));

      yield* checkEnvironmentVariables(["STELLAR_SEED", "PINATA_TOKEN", "PINATA_GROUP_ID"]);

      const projectData = yield* askQuestions();

      yield* Effect.logInfo(chalk.blue("\n📦 Uploading to IPFS..."));
      const cid = yield* pipe(
        PinataServiceCli,
        Effect.flatMap(service => service.upload(projectData)),
      );
      yield* Effect.logInfo(chalk.green(`✅ IPFS CID: ${cid}`));

      yield* Effect.logInfo(chalk.blue("\n🔗 Creating Stellar transaction..."));
      const transactionXDR = yield* pipe(
        StellarServiceCli,
        Effect.flatMap(service =>
          service.createTransaction(
            projectData.code,
            cid,
            projectData.project_account_id,
          )
        ),
      );

      yield* Effect.all([
        Effect.logInfo(chalk.green("\n✅ Project created successfully!")),
        Effect.logInfo(`${chalk.cyan("IPFS CID:")} ${cid}`),
        Effect.logInfo(chalk.cyan("Transaction XDR:")),
        Effect.logInfo(chalk.white(transactionXDR)),
      ]);
    }),
    Effect.catchAll(handleCliError),
  );

const listProjects = (): Effect.Effect<void, CliError, EnvironmentService | StellarService> =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.logInfo(chalk.blue("📋 Listing projects...\n"));

      yield* checkEnvironmentVariables(["STELLAR_SEED"]);

      yield* Effect.logInfo(chalk.blue("🔍 Fetching projects from Stellar..."));
      const projects = yield* pipe(
        StellarServiceCli,
        Effect.flatMap(service => service.listProjects()),
      );

      if (projects.length === 0) {
        yield* Effect.logInfo(chalk.yellow("No projects found."));
        return;
      }

      yield* Effect.all([
        Effect.logInfo(chalk.green(`\n✅ Found ${projects.length} projects:\n`)),
        Effect.sync(() => {
          // Transform projects for console.table
          const tableData = projects.map(project => ({
            "Project Name": project.name,
            "Code": project.code,
            "Status": project.status,
            "IPFS URL": project.ipfsUrl,
          }));
          // Console.table is allowed for CLI output
          console.table(tableData);
        }),
      ]);
    }),
    Effect.catchAll(handleCliError),
  );

const AppLayer = Layer.mergeAll(
  EnvironmentServiceLive,
  PinataServiceLive,
  StellarServiceLive,
);

// CLI setup
const program = new Command();

program
  .name("crowd-cli")
  .description("CLI for Montelibero Crowdsourcing Platform")
  .version("1.0.0");

const projectCommand = program
  .command("project")
  .description("Project management commands");

projectCommand
  .command("new")
  .description("Create a new project")
  .action(() => {
    const program = pipe(
      createProject(),
      Effect.provide(AppLayer),
    );

    BunRuntime.runMain(program);
  });

projectCommand
  .command("list")
  .description("List all projects")
  .action(() => {
    const program = pipe(
      listProjects(),
      Effect.provide(AppLayer),
    );

    BunRuntime.runMain(program);
  });

program.parse();
