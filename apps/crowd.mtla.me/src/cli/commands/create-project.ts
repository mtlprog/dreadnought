import { ProjectServiceTag } from "@/lib/stellar";
import type { ProjectData } from "@/lib/stellar/types";
import chalk from "chalk";
import { Effect, pipe } from "effect";
import prompts from "prompts";
import { PinataServiceCli } from "../services/pinata.service";
import { ValidationError } from "../types";
import { handleCliError } from "../utils/errors";
import { validateProjectData } from "../utils/validation";

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
            message: "Тикер (без префиксов P/C):",
            validate: (value: string) =>
              /^[A-Z0-9]{1,10}$/.test(value)
                ? true
                : "Тикер должен содержать только заглавные буквы и цифры (макс. 10 символов, т.к. будут добавлены префиксы P и C)",
          },
          {
            type: "text",
            name: "description",
            message: "Описание проекта:",
            validate: (value: string) => value.length > 10 ? true : "Описание должно быть минимум 10 символов",
          },
          {
            type: "text",
            name: "fulldescription",
            message: "Полное описание проекта (base64 encoded):",
            validate: (value: string) => {
              try {
                return globalThis.btoa(globalThis.atob(value)) === value
                  ? true
                  : "Должна быть корректная base64 строка";
              } catch {
                return "Должна быть корректная base64 строка";
              }
            },
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
      Object.keys(response as object).length < 8
        ? Effect.fail(
          new ValidationError({
            field: "user_input",
            message: "Operation cancelled",
          }),
        )
        : validateProjectData(response)
    ),
  );

export const createProject = () =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.logInfo(chalk.blue("🚀 Creating new project...\n"));

      const projectData = yield* askQuestions();

      yield* Effect.logInfo(chalk.blue("\n📦 Uploading to IPFS..."));
      const cid = yield* pipe(
        PinataServiceCli,
        Effect.flatMap(service => service.upload(projectData)),
      );
      yield* Effect.logInfo(chalk.green(`✅ IPFS CID: ${cid}`));

      yield* Effect.logInfo(chalk.blue("\n🔗 Creating Stellar transaction..."));
      const transactionXDR = yield* pipe(
        ProjectServiceTag,
        Effect.flatMap(service =>
          service.createProjectTransaction(
            projectData.code,
            cid,
            projectData.project_account_id,
            projectData.target_amount,
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
