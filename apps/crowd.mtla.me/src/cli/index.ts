#!/usr/bin/env bun
import chalk from "chalk";
import { Command } from "commander";
import { PinataSDK } from "pinata";
import prompts from "prompts";

import { BunRuntime } from "@effect/platform-bun";
import * as S from "@effect/schema/Schema";

import { Context, Effect, Layer, pipe } from "effect";

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

// Error types
export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  },
) {}

export class PinataError extends S.TaggedError<PinataError>()("PinataError", {
  cause: S.Unknown,
  operation: S.String,
}) {}

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

export type CliError =
  | ValidationError
  | PinataError
  | StellarError
  | EnvironmentError;

// Import project data schema
import { ProjectData } from "../lib/stellar/types";

// Services
class EnvironmentService extends Context.Tag("@crowd.mtla.me/EnvironmentService")<
  EnvironmentService,
  {
    readonly getRequired: (
      key: string,
    ) => Effect.Effect<string, EnvironmentError>;
    readonly getOptional: (
      key: string,
      defaultValue: string,
    ) => Effect.Effect<string, never>;
  }
>() {}

class PinataService extends Context.Tag("@crowd.mtla.me/PinataService")<
  PinataService,
  {
    readonly upload: (
      data: ProjectData,
    ) => Effect.Effect<
      string,
      PinataError | EnvironmentError,
      EnvironmentService
    >;
  }
>() {}

class CliStellarService extends Context.Tag("@crowd.mtla.me/CliStellarService")<
  CliStellarService,
  {
    readonly createTransaction: (
      code: string,
      cid: string,
      projectAccountId: string,
    ) => Effect.Effect<
      string,
      StellarError | EnvironmentError,
      EnvironmentService
    >;
    readonly listProjects: () => Effect.Effect<
      {
        readonly name: string;
        readonly code: string;
        readonly ipfsUrl: string;
        readonly status: "claimed" | "claimable";
      }[],
      StellarError | EnvironmentError,
      EnvironmentService
    >;
  }
>() {}

// Service implementations
const EnvironmentServiceLive = Layer.succeed(
  EnvironmentService,
  EnvironmentService.of({
    getRequired: (key: string) =>
      pipe(
        Effect.sync(() => process.env[key]),
        Effect.flatMap((value) =>
          value !== undefined && value !== ""
            ? Effect.succeed(value)
            : Effect.fail(new EnvironmentError({ variable: key }))
        ),
      ),

    getOptional: (key: string, defaultValue: string) => Effect.sync(() => process.env[key] ?? defaultValue),
  }),
);

const PinataServiceLive = Layer.succeed(
  PinataService,
  PinataService.of({
    upload: (data: ProjectData) =>
      pipe(
        Effect.all([
          pipe(
            EnvironmentService,
            Effect.flatMap((env) => env.getRequired("PINATA_TOKEN")),
          ),
          pipe(
            EnvironmentService,
            Effect.flatMap((env) => env.getRequired("PINATA_GROUP_ID")),
          ),
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
      pipe(
        EnvironmentService,
        Effect.flatMap((env) => env.getRequired("STELLAR_SEED")),
      ),
      pipe(
        EnvironmentService,
        Effect.flatMap((env) => env.getOptional("STELLAR_NETWORK", "testnet")),
      ),
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
  cid: string,
): Effect.Effect<{ name?: string; [key: string]: unknown }, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
        const response = await fetch(ipfsUrl);
        return (await response.json()) as {
          name?: string;
          [key: string]: unknown;
        };
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "fetch_ipfs_data",
        }),
    }),
  );

const checkClaimableBalanceStatus = (
  server: Horizon.Server,
  sponsorKey: string,
  assetCode: string,
): Effect.Effect<"claimed" | "claimable", StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const claimableBalances = await server
          .claimableBalances()
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

const CliStellarServiceLive = Layer.succeed(
  CliStellarService,
  CliStellarService.of({
    createTransaction: (
      code: string,
      cid: string,
      projectAccountId: string,
    ) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap(({ keypair, server, networkPassphrase }) =>
          Effect.tryPromise({
            try: async () => {
              const sourceAccount = await server.loadAccount(
                keypair.publicKey(),
              );

              const transaction = new TransactionBuilder(sourceAccount, {
                fee: "100",
                networkPassphrase,
              })
                .addOperation(
                  Operation.manageData({
                    name: `ipfshash-${code}`,
                    value: cid,
                  }),
                )
                .addOperation(
                  Operation.createClaimableBalance({
                    asset: new Asset(code, keypair.publicKey()),
                    amount: "0.0000001",
                    claimants: [
                      new Claimant(keypair.publicKey()),
                      new Claimant(projectAccountId),
                    ],
                  }),
                )
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
        Effect.flatMap((dataEntries) =>
          Effect.all(
            Object.entries(dataEntries)
              .filter(([key]) => key.startsWith("ipfshash-"))
              .map(([key, value]) => {
                const code = key.replace("ipfshash-", "");
                const cid = Buffer.from(value, "base64").toString();
                const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;

                return pipe(
                  Effect.all([
                    fetchProjectDataFromIPFS(cid),
                    pipe(
                      getStellarConfig(),
                      Effect.flatMap(({ server, keypair }) =>
                        checkClaimableBalanceStatus(
                          server,
                          keypair.publicKey(),
                          code,
                        )
                      ),
                    ),
                  ]),
                  Effect.map(([projectData, status]) => ({
                    name: projectData.name ?? code,
                    code,
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
const validateProjectData = (
  data: unknown,
): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    S.decodeUnknown(ProjectData)(data),
    Effect.mapError(
      (error) =>
        new ValidationError({
          field: "project_data",
          message: `Validation failed: ${error.message}`,
        }),
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
            validate: (value: string) =>
              value.length > 10
                ? true
                : "Описание должно быть минимум 10 символов",
          },
          {
            type: "text",
            name: "contact_account_id",
            message: "Счет координатора проекта:",
            validate: (value: string) =>
              /^G[A-Z2-7]{55}$/.test(value)
                ? true
                : "Неверный формат Stellar адреса",
          },
          {
            type: "text",
            name: "project_account_id",
            message: "Счет проекта:",
            validate: (value: string) =>
              /^G[A-Z2-7]{55}$/.test(value)
                ? true
                : "Неверный формат Stellar адреса",
          },
          {
            type: "text",
            name: "target_amount",
            message: "Цель сбора:",
            validate: (value: string) =>
              /^\d+(\.\d+)?$/.test(value) && parseFloat(value) > 0
                ? true
                : "Введите положительное число",
          },
          {
            type: "text",
            name: "deadline",
            message: "Дедлайн (YYYY-MM-DD):",
            validate: (value: string) => {
              const date = new Date(value);
              return !isNaN(date.getTime()) && date > new Date()
                ? true
                : "Введите корректную дату в будущем";
            },
          },
        ]),
      catch: (error) =>
        new ValidationError({
          field: "user_input",
          message: `Failed to get user input: ${error}`,
        }),
    }),
    Effect.flatMap((response) =>
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
  requiredVars: string[],
): Effect.Effect<void, EnvironmentError, EnvironmentService> =>
  pipe(
    Effect.sync(() => console.log(chalk.blue("🔍 Checking environment variables..."))),
    Effect.flatMap(() => EnvironmentService),
    Effect.flatMap((env) =>
      Effect.all(
        requiredVars.map((varName) => env.getRequired(varName)),
        { concurrency: "unbounded" },
      )
    ),
    Effect.flatMap(() => Effect.sync(() => console.log(chalk.green("✅ Environment variables OK\n")))),
  );

// Shared error handling
const handleCliError = (error: CliError): Effect.Effect<void, never> =>
  Effect.sync(() => {
    console.error(chalk.red("❌ Error:"), error);
    process.exit(1);
  });

const createProject = (): Effect.Effect<
  void,
  CliError,
  EnvironmentService | PinataService | CliStellarService
> =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.sync(() => console.log(chalk.blue("🚀 Creating new project...\n")));

      yield* checkEnvironmentVariables([
        "STELLAR_SEED",
        "PINATA_TOKEN",
        "PINATA_GROUP_ID",
      ]);

      const projectData = yield* askQuestions();

      yield* Effect.sync(() => console.log(chalk.blue("\n📦 Uploading to IPFS...")));
      const cid = yield* pipe(
        PinataService,
        Effect.flatMap((service) => service.upload(projectData)),
      );
      yield* Effect.sync(() => console.log(chalk.green(`✅ IPFS CID: ${cid}`)));

      yield* Effect.sync(() => console.log(chalk.blue("\n🔗 Creating Stellar transaction...")));
      const transactionXDR = yield* pipe(
        CliStellarService,
        Effect.flatMap((service) =>
          service.createTransaction(
            projectData.code,
            cid,
            projectData.project_account_id,
          )
        ),
      );

      yield* Effect.sync(() => {
        console.log(chalk.green("\n✅ Project created successfully!"));
        console.log(chalk.cyan("IPFS CID:"), cid);
        console.log(chalk.cyan("Transaction XDR:"));
        console.log(chalk.white(transactionXDR));
      });
    }),
    Effect.catchAll(handleCliError),
  );

const listProjects = (): Effect.Effect<
  void,
  CliError,
  EnvironmentService | CliStellarService
> =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.sync(() => console.log(chalk.blue("📋 Listing projects...\n")));

      yield* checkEnvironmentVariables(["STELLAR_SEED"]);

      yield* Effect.sync(() => console.log(chalk.blue("🔍 Fetching projects from Stellar...")));
      const projects = yield* pipe(
        CliStellarService,
        Effect.flatMap((service) => service.listProjects()),
      );

      if (projects.length === 0) {
        yield* Effect.sync(() => console.log(chalk.yellow("No projects found.")));
        return;
      }

      yield* Effect.sync(() => {
        console.log(chalk.green(`\n✅ Found ${projects.length} projects:\n`));

        // Transform projects for console.table
        const tableData = projects.map((project) => ({
          "Project Name": project.name,
          Code: project.code,
          Status: project.status,
          "IPFS URL": project.ipfsUrl,
        }));

        console.table(tableData);
      });
    }),
    Effect.catchAll(handleCliError),
  );

const AppLayer = Layer.mergeAll(
  EnvironmentServiceLive,
  PinataServiceLive,
  CliStellarServiceLive,
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
    const program = pipe(createProject(), Effect.provide(AppLayer));

    BunRuntime.runMain(program);
  });

projectCommand
  .command("list")
  .description("List all projects")
  .action(() => {
    const program = pipe(listProjects(), Effect.provide(AppLayer));

    BunRuntime.runMain(program);
  });

program.parse();
