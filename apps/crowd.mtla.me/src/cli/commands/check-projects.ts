import { StellarCheckServiceTag } from "@/lib/stellar";
import type { ProjectCheckResult } from "@/lib/stellar/check-service";
import { getStellarConfig, type StellarConfig } from "@/lib/stellar/config";
import type { ProjectDataWithResults } from "@/lib/stellar/types";
import { collectSupportersData } from "@/lib/stellar/utils";
import { BASE_FEE, Operation, TimeoutInfinite, TransactionBuilder } from "@stellar/stellar-sdk";
import chalk from "chalk";
import { Effect, pipe } from "effect";
import prompts from "prompts";
import { PinataServiceCli } from "../services/pinata.service";
import { ValidationError } from "../types";
import { handleCliError } from "../utils/errors";
import { fetchProjectFromIPFS } from "../utils/ipfs";

/**
 * What the operator chose to do with a project at the confirmation prompt.
 * `force` is only ever returned when force-funding is available for the project.
 */
type ProjectAction = "process" | "force" | "skip";

/**
 * Ask the operator how to handle a project. Unlike a plain y/n confirm this
 * exposes a third `f` (force-fund) option for refund-eligible projects whose
 * terms require the collected funds to be handed to the initiator even though
 * the goal was not reached. Anything other than an explicit `y`/`yes` (or `f`
 * when offered) is treated as skip — money operations never proceed on
 * ambiguous input or cancellation.
 */
const promptProjectAction = (
  projectName: string,
  projectCode: string,
  dataToUpload: ProjectDataWithResults,
  forceAvailable: boolean,
): Effect.Effect<ProjectAction, ValidationError> => {
  const forceLine = forceAvailable
    ? chalk.red(
      `  [f] FORCE-FUND: deliver the collected funds to the project account despite the goal NOT being reached (status → force_funded).\n`,
    )
    : ``;
  const forceChoice = forceAvailable ? ` / [f] force-fund` : ``;

  return Effect.tryPromise({
    try: () =>
      prompts({
        type: "text",
        name: "choice",
        message: chalk.yellow(
          `\nProcess project ${projectName} (${projectCode})?\n`
            + `  Funded: ${dataToUpload.funded_amount ?? "0"} MTLCrowd\n`
            + `  Supporters: ${dataToUpload.supporters_count ?? 0}\n`
            + `  Remaining: ${dataToUpload.remaining_amount ?? "0"} MTLCrowd\n`
            + `  Status: ${dataToUpload.funding_status ?? "unknown"}\n`
            + `This data will be uploaded to IPFS and added to the transaction.\n`
            + `${forceLine}Choose: [y] proceed${forceChoice} / [n] skip`,
        ),
        initial: "y",
      }),
    catch: (error) =>
      new ValidationError({
        field: "user_confirmation",
        message: `Failed to get confirmation: ${error}`,
      }),
  }).pipe(
    Effect.map((response): ProjectAction => {
      const raw = (response as { choice?: string }).choice;
      // Cancellation (Ctrl+C) yields no value — skip.
      if (raw === undefined) return "skip";
      const choice = raw.trim().toLowerCase();
      if (forceAvailable && (choice === "f" || choice === "force")) return "force";
      if (choice === "y" || choice === "yes") return "process";
      return "skip";
    }),
  );
};

const waitForUserToSubmit = (): Effect.Effect<void, ValidationError> =>
  pipe(
    Effect.tryPromise({
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
    }),
    Effect.asVoid,
  );

export const checkProjects = () =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.logInfo(chalk.blue("🔍 Checking project deadlines and funding...\n"));

      const checkResults = yield* pipe(
        StellarCheckServiceTag,
        Effect.flatMap((service) => service.checkAllProjects()),
      );

      if (checkResults.length === 0) {
        yield* Effect.logInfo(chalk.yellow("No projects found."));
        return;
      }

      const projectsNeedingAction = checkResults.filter((r) => r.action !== "no_action");
      const projectsWithErrors = checkResults.filter((r) => r.error !== undefined);
      const expiredProjects = checkResults.filter((r) => r.isExpired);
      const goalReachedProjects = checkResults.filter((r) => r.isGoalReached);

      yield* Effect.logInfo(chalk.cyan(`\n📊 Summary:`));
      yield* Effect.logInfo(chalk.white(`Total projects: ${checkResults.length}`));
      yield* Effect.logInfo(chalk.white(`Expired projects: ${expiredProjects.length}`));
      yield* Effect.logInfo(chalk.white(`Goal reached projects: ${goalReachedProjects.length}`));
      yield* Effect.logInfo(chalk.white(`Projects needing action: ${projectsNeedingAction.length}`));
      if (projectsWithErrors.length > 0) {
        yield* Effect.logInfo(chalk.red(`Projects with errors: ${projectsWithErrors.length}`));
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

      yield* Effect.logInfo(chalk.blue(`\n🔗 Processing projects requiring action:\n`));

      const config = yield* getStellarConfig();

      for (const result of projectsNeedingAction) {
        yield* processProject(result, config);
      }

      yield* Effect.logInfo(
        chalk.blue(`\n✅ Processed ${projectsNeedingAction.length} projects.`),
      );
    }),
    Effect.catchAll(handleCliError),
  );

/**
 * Process a single project: fetch IPFS data, compute final metrics, confirm
 * with the user, upload new IPFS metadata, and build the combined XDR
 * (manageData + all ops from the check service) against a freshly loaded
 * source account.
 */
const processProject = (
  result: ProjectCheckResult,
  config: StellarConfig,
) =>
  Effect.gen(function*() {
    const actionEmoji = result.action === "fund_project" ? "💰" : "🔄";
    const actionText = result.action === "fund_project" ? "Fund Project" : "Refund Supporters";
    const statusColor = result.isGoalReached ? chalk.green : chalk.red;

    yield* Effect.logInfo(chalk.cyan(`${actionEmoji} ${result.name} (${result.code})`));
    yield* Effect.logInfo(chalk.white(`  Deadline: ${result.deadline}`));
    yield* Effect.logInfo(chalk.white(`  Target: ${result.targetAmount} MTLCrowd`));
    yield* Effect.logInfo(chalk.white(`  Current: ${result.currentAmount} MTLCrowd`));
    yield* Effect.logInfo(statusColor(`  Goal reached: ${result.isGoalReached ? "Yes" : "No"}`));
    yield* Effect.logInfo(chalk.white(`  Claimable balances: ${result.claimableBalancesCount}`));
    yield* Effect.logInfo(chalk.white(`  Token holders: ${result.tokenHoldersCount}`));
    yield* Effect.logInfo(chalk.yellow(`  Action: ${actionText}`));

    // Fetch current IPFS metadata and compute final funding metrics.
    yield* Effect.logInfo(chalk.blue(`\n📥 Fetching current project data...`));
    const currentData = yield* fetchProjectFromIPFS(result.code);

    const supportersData = collectSupportersData(
      result.claimableBalances,
      result.code,
      config.publicKey,
    );
    const supportersCount = supportersData.length;
    const fundedAmount = result.currentAmount;

    // Remaining amount comes from the active offer that the check service
    // already fetched — no extra Horizon request needed.
    const remainingAmount = result.activeOffer?.amount ?? "0";
    const defaultFundingStatus: "completed" | "canceled" = parseFloat(remainingAmount) === 0
      ? "completed"
      : "canceled";

    // Force-funding is offered only for refund-eligible projects that actually
    // have collected funds to deliver (operations precomputed by the check
    // service).
    const forceAvailable = result.action === "refund" && result.forceFundOperations !== undefined;

    const buildData = (
      fundingStatus: "completed" | "canceled" | "force_funded",
    ): ProjectDataWithResults => ({
      ...currentData,
      ...(fundedAmount !== "0" ? { funded_amount: fundedAmount } : {}),
      ...(supportersCount > 0 ? { supporters_count: supportersCount } : {}),
      ...(remainingAmount !== "0" ? { remaining_amount: remainingAmount } : {}),
      ...(supportersData.length > 0 ? { supporters: supportersData } : {}),
      funding_status: fundingStatus,
    });

    yield* Effect.logInfo(chalk.cyan(`\n📊 Funding results:`));
    yield* Effect.logInfo(chalk.white(`  Funded amount: ${fundedAmount} MTLCrowd`));
    yield* Effect.logInfo(chalk.white(`  Supporters: ${supportersCount}`));
    yield* Effect.logInfo(chalk.white(`  Remaining: ${remainingAmount} MTLCrowd`));
    yield* Effect.logInfo(chalk.white(`  Status: ${defaultFundingStatus}`));

    const action = yield* promptProjectAction(
      result.name,
      result.code,
      buildData(defaultFundingStatus),
      forceAvailable,
    );
    if (action === "skip") {
      yield* Effect.logInfo(chalk.yellow(`\n⏭️  Skipped ${result.code}`));
      return;
    }

    const isForce = action === "force";
    // `forceFundOperations` is guaranteed present whenever `isForce` is true
    // (force is only returned when forceAvailable), but fall back defensively.
    const operations = isForce
      ? (result.forceFundOperations ?? result.operations)
      : result.operations;
    const fundingStatus = isForce ? "force_funded" as const : defaultFundingStatus;
    const dataWithResults = buildData(fundingStatus);

    if (isForce) {
      yield* Effect.logInfo(
        chalk.red(
          `\n⚡ FORCE-FUNDING ${result.code}: delivering ${fundedAmount} MTLCrowd to the `
            + `project account despite the goal not being reached.`,
        ),
      );
    }

    yield* Effect.logInfo(chalk.blue(`\n📦 Uploading to IPFS...`));
    const newCid = yield* pipe(
      PinataServiceCli,
      Effect.flatMap((service) => service.upload(dataWithResults)),
      Effect.mapError((error) =>
        new ValidationError({ field: "ipfs_upload", message: `Failed to upload to IPFS: ${error}` })
      ),
    );
    yield* Effect.logInfo(chalk.green(`✅ New IPFS CID: ${newCid}`));

    // Load the source account fresh so the sequence number is current when
    // the user signs and submits the transaction.
    yield* Effect.logInfo(chalk.blue(`\n🔗 Building transaction...`));
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

    // IPFS hash update first — the rest come straight from the check service.
    txBuilder.addOperation(Operation.manageData({
      name: `ipfshash-P${result.code}`,
      value: newCid,
    }));
    for (const op of operations) {
      txBuilder.addOperation(op);
    }

    const finalXDR = txBuilder.setTimeout(TimeoutInfinite).build().toXDR();

    const opsLabel = isForce
      ? "force-fund"
      : result.action === "fund_project"
      ? "funding"
      : "refund";

    yield* Effect.logInfo(chalk.green(`\n✅ Combined transaction created`));
    yield* Effect.logInfo(
      chalk.cyan(
        `  - NFT metadata update + ${opsLabel} operations`,
      ),
    );
    yield* Effect.logInfo(chalk.cyan(`\nTransaction XDR:`));
    yield* Effect.logInfo(chalk.white(finalXDR));
    yield* Effect.logInfo(chalk.yellow(`\n⚠️  Please sign and submit this transaction.`));
    yield* Effect.logInfo(chalk.yellow(`⚠️  After submission, press Enter to continue to next project...`));

    yield* waitForUserToSubmit();
    yield* Effect.logInfo("");
  });
