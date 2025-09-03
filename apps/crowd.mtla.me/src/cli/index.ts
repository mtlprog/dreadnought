#!/usr/bin/env bun

import { BunRuntime } from "@effect/platform-bun";
import { Command } from "commander";
import { Effect, pipe } from "effect";
import { checkProjects } from "./commands/check-projects";
import { createProject } from "./commands/create-project";
import { listProjects } from "./commands/list-projects";
import { AppLayer } from "./layers";

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

projectCommand
  .command("check")
  .description("Check project deadlines and process expired projects")
  .action(() => {
    const program = pipe(
      checkProjects(),
      Effect.provide(AppLayer),
    );

    BunRuntime.runMain(program);
  });

program.parse();
