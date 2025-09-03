import { StellarServiceTag } from "@/lib/stellar";
import chalk from "chalk";
import { Effect, pipe } from "effect";
import { handleCliError } from "../utils/errors";

export const listProjects = () =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.logInfo(chalk.blue("📋 Listing projects...\n"));

      yield* Effect.logInfo(chalk.blue("🔍 Fetching projects from Stellar..."));
      const projects = yield* pipe(
        StellarServiceTag,
        Effect.flatMap(service => service.getProjects()),
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
            "Current": project.current_amount,
            "Target": project.target_amount,
            "Supporters": project.supporters_count,
          }));
          // Console.table is allowed for CLI output
          console.table(tableData);
        }),
      ]);
    }),
    Effect.catchAll(handleCliError),
  );
