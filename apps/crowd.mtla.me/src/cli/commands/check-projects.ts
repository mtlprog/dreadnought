import { StellarCheckServiceTag } from "@/lib/stellar";
import chalk from "chalk";
import { Effect, pipe } from "effect";
import { handleCliError } from "../utils/errors";

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

      // Display results and transactions
      yield* Effect.logInfo(chalk.blue(`\n🔗 Projects requiring action:\n`));

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

        if (result.transactionXDR !== undefined) {
          yield* Effect.logInfo(chalk.gray(`  Transaction XDR:`));
          yield* Effect.logInfo(chalk.white(`  ${result.transactionXDR}`));
        }
        yield* Effect.logInfo(""); // Empty line between projects
      }

      yield* Effect.logInfo(
        chalk.blue(`🔗 Generated ${projectsNeedingAction.length} transactions for expired projects.`),
      );
      yield* Effect.logInfo(chalk.yellow("⚠️ Please review and sign these transactions manually."));
    }),
    Effect.catchAll(handleCliError),
  );
