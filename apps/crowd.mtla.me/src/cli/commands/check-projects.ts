import { StellarCheckServiceTag } from "@/lib/stellar";
import type { ProjectDataWithResults } from "@/lib/stellar/types";
import { collectSupportersData } from "@/lib/stellar/utils";
import chalk from "chalk";
import { Effect, pipe } from "effect";
import prompts from "prompts";
import { PinataServiceCli } from "../services/pinata.service";
import { ValidationError } from "../types";
import { handleCliError } from "../utils/errors";
import { fetchProjectFromIPFS } from "../utils/ipfs";
import { findActiveSellOffer } from "../utils/offer";

const confirmProjectProcessing = (
  projectName: string,
  projectCode: string,
  dataToUpload: ProjectDataWithResults,
): Effect.Effect<boolean, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        prompts({
          type: "confirm",
          name: "confirmed",
          message: chalk.yellow(
            `\nProcess project ${projectName} (${projectCode})?\n`
              + `  Funded: ${dataToUpload.funded_amount ?? "0"} MTLCrowd\n`
              + `  Supporters: ${dataToUpload.supporters_count ?? 0}\n`
              + `  Remaining: ${dataToUpload.remaining_amount ?? "0"} MTLCrowd\n`
              + `  Status: ${dataToUpload.funding_status ?? "unknown"}\n`
              + `This data will be uploaded to IPFS and added to the transaction.`,
          ),
          initial: true,
        }),
      catch: (error) =>
        new ValidationError({
          field: "user_confirmation",
          message: `Failed to get confirmation: ${error}`,
        }),
    }),
    Effect.flatMap(response => {
      const confirmed = (response as { confirmed?: boolean }).confirmed;
      return confirmed === true
        ? Effect.succeed(true)
        : Effect.succeed(false);
    }),
  );

export const checkProjects = () =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.logInfo(chalk.blue("🔍 Checking project deadlines and funding...\n"));

      yield* Effect.logInfo(chalk.blue("📋 Fetching and checking all projects..."));

      const checkResults = yield* pipe(
        StellarCheckServiceTag,
        Effect.flatMap(service => service.checkAllProjects()),
      );

      if (checkResults.length === 0) {
        yield* Effect.logInfo(chalk.yellow("No projects found."));
        return;
      }

      // Filter projects by status
      const expiredProjects = checkResults.filter(result => result.isExpired);
      const goalReachedProjects = checkResults.filter(result => result.isGoalReached);
      const projectsNeedingAction = checkResults.filter(result => result.action !== "no_action");
      const projectsWithErrors = checkResults.filter(result => result.error !== undefined);

      yield* Effect.logInfo(chalk.cyan(`\n📊 Summary:`));
      yield* Effect.logInfo(chalk.white(`Total projects: ${checkResults.length}`));
      yield* Effect.logInfo(chalk.white(`Expired projects: ${expiredProjects.length}`));
      yield* Effect.logInfo(chalk.white(`Goal reached projects: ${goalReachedProjects.length}`));
      yield* Effect.logInfo(chalk.white(`Projects needing action: ${projectsNeedingAction.length}`));
      if (projectsWithErrors.length > 0) {
        yield* Effect.logInfo(chalk.red(`Projects with errors: ${projectsWithErrors.length}`));
      }

      // Display errors first
      if (projectsWithErrors.length > 0) {
        yield* Effect.logInfo(chalk.red(`\n❌ Projects with errors:`));
        for (const result of projectsWithErrors) {
          yield* Effect.logInfo(chalk.red(`- ${result.name} (${result.code}): ${result.error}`));
        }
      }

      if (projectsNeedingAction.length === 0) {
        yield* Effect.logInfo(
          chalk.green("\n✅ No actions needed. All projects are either active or have no funding."),
        );
        return;
      }

      // Process each project sequentially
      yield* Effect.logInfo(chalk.blue(`\n🔗 Processing projects requiring action:\n`));

      for (const result of projectsNeedingAction) {
        const actionEmoji = result.action === "fund_project" ? "💰" : "🔄";
        const actionText = result.action === "fund_project" ? "Fund Project" : "Refund Supporters";
        const statusColor = result.isGoalReached === true ? chalk.green : chalk.red;

        yield* Effect.logInfo(chalk.cyan(`${actionEmoji} ${result.name} (${result.code})`));
        yield* Effect.logInfo(chalk.white(`  Deadline: ${result.deadline}`));
        yield* Effect.logInfo(chalk.white(`  Target: ${result.targetAmount} MTLCrowd`));
        yield* Effect.logInfo(chalk.white(`  Current: ${result.currentAmount} MTLCrowd`));
        yield* Effect.logInfo(statusColor(`  Goal reached: ${result.isGoalReached === true ? "Yes" : "No"}`));
        yield* Effect.logInfo(chalk.white(`  Claimable balances: ${result.claimableBalancesCount}`));
        yield* Effect.logInfo(chalk.white(`  Token holders: ${result.tokenHoldersCount}`));
        yield* Effect.logInfo(chalk.yellow(`  Action: ${actionText}`));

        // Fetch current project data from IPFS
        yield* Effect.logInfo(chalk.blue(`\n📥 Fetching current project data...`));
        const currentData = yield* fetchProjectFromIPFS(result.code);

        // Calculate supporters count and collect supporters data
        const { getStellarConfig } = yield* Effect.promise(() => import("@/lib/stellar/config"));
        const config = yield* getStellarConfig();

        // Collect supporters data from claimable balances and token holders
        const supportersData = collectSupportersData(
          result.claimableBalances,
          result.tokenHolders,
          result.code,
          config.publicKey,
        );

        const supportersCount = supportersData.length;

        // Determine remaining amount from active offer
        const activeOffer = yield* pipe(
          findActiveSellOffer(result.code),
          Effect.catchAll(() => Effect.succeed(null)),
        );

        const remainingAmount = activeOffer !== null ? activeOffer.amount : "0";
        const fundedAmount = result.currentAmount;

        // Determine funding status: completed if no remaining amount, canceled otherwise
        const fundingStatus: "completed" | "canceled" = parseFloat(remainingAmount) === 0 ? "completed" : "canceled";

        // Prepare data with funding results
        const dataWithResults: ProjectDataWithResults = {
          ...currentData,
          ...(fundedAmount !== "0" ? { funded_amount: fundedAmount } : {}),
          ...(supportersCount > 0 ? { supporters_count: supportersCount } : {}),
          ...(remainingAmount !== "0" ? { remaining_amount: remainingAmount } : {}),
          ...(supportersData.length > 0 ? { supporters: supportersData } : {}),
          funding_status: fundingStatus,
        };

        // Show data and ask for confirmation
        yield* Effect.logInfo(chalk.cyan(`\n📊 Funding results:`));
        yield* Effect.logInfo(chalk.white(`  Funded amount: ${fundedAmount} MTLCrowd`));
        yield* Effect.logInfo(chalk.white(`  Supporters: ${supportersCount}`));
        yield* Effect.logInfo(chalk.white(`  Remaining: ${remainingAmount} MTLCrowd`));
        yield* Effect.logInfo(chalk.white(`  Status: ${fundingStatus}`));

        const confirmed = yield* confirmProjectProcessing(result.name, result.code, dataWithResults);

        if (!confirmed) {
          yield* Effect.logInfo(chalk.yellow(`\n⏭️  Skipped ${result.code}`));
          continue;
        }

        // Upload to IPFS
        yield* Effect.logInfo(chalk.blue(`\n📦 Uploading to IPFS...`));
        const newCid = yield* pipe(
          PinataServiceCli,
          Effect.flatMap(service => service.upload(dataWithResults)),
        );
        yield* Effect.logInfo(chalk.green(`✅ New IPFS CID: ${newCid}`));

        // Create combined transaction: NFT update + funding/refund operations
        yield* Effect.logInfo(chalk.blue(`\n🔗 Creating transaction...`));

        const { TransactionBuilder, Operation, BASE_FEE, TimeoutInfinite } = yield* Effect.promise(() =>
          import("@stellar/stellar-sdk")
        );

        const sourceAccount = yield* Effect.tryPromise({
          try: () => config.server.loadAccount(config.publicKey),
          catch: (error) =>
            new ValidationError({
              field: "stellar_account",
              message: `Failed to load account: ${error}`,
            }),
        });

        const txBuilder = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        });

        // First operation: Update IPFS hash
        txBuilder.addOperation(Operation.manageData({
          name: `ipfshash-P${result.code}`,
          value: newCid,
        }));

        // Add funding/refund operations from original transaction (if exists)
        if (result.transactionXDR !== undefined) {
          const { TransactionBuilder: TB } = yield* Effect.promise(() => import("@stellar/stellar-sdk"));
          const originalTx = TB.fromXDR(result.transactionXDR, config.networkPassphrase);

          // Add all operations from original transaction with validation
          for (const op of originalTx.operations) {
            const opType = op.type;

            // Validate and add operation based on type
            if (opType === "claimClaimableBalance") {
              if ("balanceId" in op && typeof op.balanceId === "string") {
                txBuilder.addOperation(Operation.claimClaimableBalance({
                  balanceId: op.balanceId,
                }));
              } else {
                yield* Effect.logWarning(`Invalid claimClaimableBalance operation: missing balanceId`);
              }
            } else if (opType === "clawback") {
              if (
                "asset" in op && "from" in op && "amount" in op
                && typeof op.from === "string" && typeof op.amount === "string"
              ) {
                txBuilder.addOperation(Operation.clawback({
                  asset: op.asset,
                  from: op.from,
                  amount: op.amount,
                }));
              } else {
                yield* Effect.logWarning(`Invalid clawback operation: missing required fields`);
              }
            } else if (opType === "payment") {
              if (
                "destination" in op && "asset" in op && "amount" in op
                && typeof op.destination === "string" && typeof op.amount === "string"
              ) {
                txBuilder.addOperation(Operation.payment({
                  destination: op.destination,
                  asset: op.asset,
                  amount: op.amount,
                }));
              } else {
                yield* Effect.logWarning(`Invalid payment operation: missing required fields`);
              }
            } else if (opType === "manageSellOffer") {
              if (
                "selling" in op && "buying" in op && "amount" in op
                && "price" in op && "offerId" in op
                && typeof op.amount === "string" && typeof op.price === "string"
                && typeof op.offerId === "string"
              ) {
                txBuilder.addOperation(Operation.manageSellOffer({
                  selling: op.selling,
                  buying: op.buying,
                  amount: op.amount,
                  price: op.price,
                  offerId: op.offerId,
                }));
              } else {
                yield* Effect.logWarning(`Invalid manageSellOffer operation: missing required fields`);
              }
            } else if (opType === "createClaimableBalance") {
              if (
                "asset" in op && "amount" in op && "claimants" in op
                && typeof op.amount === "string" && Array.isArray(op.claimants)
              ) {
                txBuilder.addOperation(Operation.createClaimableBalance({
                  asset: op.asset,
                  amount: op.amount,
                  claimants: op.claimants,
                }));
              } else {
                yield* Effect.logWarning(`Invalid createClaimableBalance operation: missing required fields`);
              }
            } else {
              yield* Effect.logWarning(`Unknown operation type: ${opType}`);
            }
          }
        }

        const finalTransaction = txBuilder
          .setTimeout(TimeoutInfinite)
          .build();

        const finalXDR = finalTransaction.toXDR();

        yield* Effect.logInfo(chalk.green(`\n✅ Combined transaction created`));
        if (result.transactionXDR !== undefined) {
          yield* Effect.logInfo(
            chalk.cyan(
              `  - NFT metadata update + ${result.action === "fund_project" ? "funding" : "refund"} operations`,
            ),
          );
        } else {
          yield* Effect.logInfo(chalk.cyan(`  - NFT metadata update only`));
        }
        yield* Effect.logInfo(chalk.cyan(`\nTransaction XDR:`));
        yield* Effect.logInfo(chalk.white(finalXDR));
        yield* Effect.logInfo(chalk.yellow(`\n⚠️  Please sign and submit this transaction.`));
        yield* Effect.logInfo(chalk.yellow(`⚠️  After submission, press Enter to continue to next project...`));

        // Wait for user to press Enter
        yield* Effect.tryPromise({
          try: () =>
            prompts({
              type: "confirm",
              name: "continue",
              message: "Transaction submitted? Continue to next project?",
              initial: true,
            }),
          catch: (error) =>
            new ValidationError({
              field: "user_confirmation",
              message: `Failed to get confirmation: ${error}`,
            }),
        });

        yield* Effect.logInfo(""); // Empty line between projects
      }

      yield* Effect.logInfo(
        chalk.blue(`\n✅ Processed ${projectsNeedingAction.length} projects.`),
      );
    }),
    Effect.catchAll(handleCliError),
  );
