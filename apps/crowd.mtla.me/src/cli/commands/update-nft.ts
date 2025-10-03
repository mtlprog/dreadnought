import type { ProjectData, ProjectDataWithResults } from "@/lib/stellar/types";
import chalk from "chalk";
import { Effect, pipe } from "effect";
import prompts from "prompts";
import { PinataServiceCli } from "../services/pinata.service";
import { ValidationError } from "../types";
import { handleCliError } from "../utils/errors";
import { type FundingData, getCurrentFundingData, getHistoricalFundingData } from "../utils/funding-history";
import { fetchProjectFromIPFS } from "../utils/ipfs";
import { calculateSoldAmount, findActiveSellOffer } from "../utils/offer";
import { validateProjectData } from "../utils/validation";

const askToAddFundingData = (
  fundingData: FundingData,
): Effect.Effect<boolean, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        prompts({
          type: "confirm",
          name: "addFundingData",
          message: chalk.yellow(
            `\nДобавить данные о финансировании в NFT?\n`
              + `  Собрано: ${fundingData.funded_amount} MTLCrowd\n`
              + `  Поддержавших: ${fundingData.supporters_count}\n`
              + `  Осталось: ${fundingData.remaining_amount} MTLCrowd\n`
              + `  Статус: ${fundingData.funding_status}`,
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
      const confirmed = (response as { addFundingData?: boolean }).addFundingData;
      return confirmed === true
        ? Effect.succeed(true)
        : Effect.succeed(false);
    }),
  );

const askForAssetCode = (): Effect.Effect<string, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        prompts({
          type: "text",
          name: "assetCode",
          message: "Asset code NFT (без префикса P):",
          validate: (value: string) =>
            /^[A-Z0-9]{1,10}$/.test(value)
              ? true
              : "Asset code должен содержать только заглавные буквы и цифры (макс. 10 символов)",
        }),
      catch: (error) =>
        new ValidationError({
          field: "asset_code",
          message: `Failed to get asset code: ${error}`,
        }),
    }),
    Effect.flatMap(response => {
      const assetCode = (response as { assetCode?: string }).assetCode;
      return assetCode !== undefined && assetCode !== ""
        ? Effect.succeed(assetCode)
        : Effect.fail(
          new ValidationError({
            field: "asset_code",
            message: "Operation cancelled",
          }),
        );
    }),
  );

const askForUpdatedData = (
  currentData: ProjectData | ProjectDataWithResults,
): Effect.Effect<ProjectData | ProjectDataWithResults, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        prompts([
          {
            type: "text",
            name: "name",
            message: "Название проекта:",
            initial: currentData.name,
            validate: (value: string) => value.length > 0 ? true : "Название обязательно",
          },
          {
            type: "text",
            name: "code",
            message: "Тикер (без префиксов P/C):",
            initial: currentData.code,
            validate: (value: string) =>
              /^[A-Z0-9]{1,10}$/.test(value)
                ? true
                : "Тикер должен содержать только заглавные буквы и цифры (макс. 10 символов)",
          },
          {
            type: "text",
            name: "description",
            message: "Описание проекта:",
            initial: currentData.description,
            validate: (value: string) => value.length > 10 ? true : "Описание должно быть минимум 10 символов",
          },
          {
            type: "text",
            name: "fulldescription",
            message: "Полное описание проекта (base64 encoded):",
            initial: currentData.fulldescription,
            validate: (value: string) => {
              // Check if valid base64 format
              const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
              if (!base64Regex.test(value)) {
                return "Должна быть корректная base64 строка";
              }
              try {
                // Try to decode to verify it's valid
                globalThis.atob(value);
                return true;
              } catch {
                return "Должна быть корректная base64 строка";
              }
            },
          },
          {
            type: "text",
            name: "contact_account_id",
            message: "Счет координатора проекта:",
            initial: currentData.contact_account_id,
            validate: (value: string) => /^G[A-Z2-7]{55}$/.test(value) ? true : "Неверный формат Stellar адреса",
          },
          {
            type: "text",
            name: "project_account_id",
            message: "Счет проекта:",
            initial: currentData.project_account_id,
            validate: (value: string) => /^G[A-Z2-7]{55}$/.test(value) ? true : "Неверный формат Stellar адреса",
          },
          {
            type: "text",
            name: "target_amount",
            message: "Цель сбора:",
            initial: currentData.target_amount,
            validate: (value: string) =>
              /^\d+(\.\d+)?$/.test(value) && parseFloat(value) > 0 ? true : "Введите положительное число",
          },
          {
            type: "text",
            name: "deadline",
            message: "Дедлайн (YYYY-MM-DD):",
            initial: currentData.deadline,
            validate: (value: string) => {
              const date = new Date(value);
              // Just validate format - allow any date (past or future)
              return !isNaN(date.getTime()) ? true : "Введите корректную дату в формате YYYY-MM-DD";
            },
          },
        ]),
      catch: (error) =>
        new ValidationError({
          field: "user_input",
          message: `Failed to get user input: ${error}`,
        }),
    }),
    Effect.flatMap(response => {
      if (Object.keys(response as object).length < 8) {
        return Effect.fail(
          new ValidationError({
            field: "user_input",
            message: "Operation cancelled",
          }),
        );
      }

      // Validate base project data
      return pipe(
        validateProjectData(response),
        Effect.map(validatedData => {
          // Preserve funding fields if they exist in currentData
          const result: ProjectData | ProjectDataWithResults = {
            ...validatedData,
          };

          if ("funded_amount" in currentData && currentData.funded_amount !== undefined) {
            return {
              ...result,
              funded_amount: currentData.funded_amount,
              ...(currentData.supporters_count !== undefined ? { supporters_count: currentData.supporters_count } : {}),
              ...(currentData.remaining_amount !== undefined ? { remaining_amount: currentData.remaining_amount } : {}),
              ...(currentData.funding_status !== undefined ? { funding_status: currentData.funding_status } : {}),
              ...(currentData.supporters !== undefined ? { supporters: currentData.supporters } : {}),
            };
          }

          return result;
        }),
      );
    }),
  );

// Constants
const STELLAR_DECIMAL_PLACES = 7;
const CROWDFUNDING_EXCHANGE_RATE = "1.0000000"; // 1:1 with MTLCrowd

const createUpdateTransaction = (
  assetCode: string,
  currentData: ProjectData,
  updatedData: ProjectData,
  newCid: string,
): Effect.Effect<string, ValidationError> =>
  pipe(
    Effect.gen(function*() {
      const { getStellarConfig } = yield* Effect.promise(() => import("@/lib/stellar/config"));
      const { TransactionBuilder, Operation, BASE_FEE, TimeoutInfinite, Asset } = yield* Effect.promise(() =>
        import("@stellar/stellar-sdk")
      );

      const config = yield* getStellarConfig();

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

      // Always update IPFS hash
      txBuilder.addOperation(Operation.manageData({
        name: `ipfshash-P${assetCode}`,
        value: newCid,
      }));

      // Check if target_amount changed
      const targetAmountChanged = currentData.target_amount !== updatedData.target_amount;

      if (targetAmountChanged) {
        // Find existing offer
        const existingOffer = yield* findActiveSellOffer(assetCode);

        if (existingOffer === null) {
          return yield* Effect.fail(
            new ValidationError({
              field: "offer",
              message: `No active sell offer found for C${assetCode}. Cannot update target amount.`,
            }),
          );
        }

        // Calculate sold amount
        const soldAmount = yield* calculateSoldAmount(assetCode);
        const soldAmountNum = parseFloat(soldAmount);
        const newTargetNum = parseFloat(updatedData.target_amount);

        // Calculate remaining amount to sell
        const remainingAmount = newTargetNum - soldAmountNum;

        if (remainingAmount < 0) {
          return yield* Effect.fail(
            new ValidationError({
              field: "target_amount",
              message: `New target amount (${newTargetNum}) is less than already sold (${soldAmountNum}).`,
            }),
          );
        }

        // Delete old offer
        // NOTE: There's a potential race condition here - the offer might be
        // partially or fully filled between checking and deleting it.
        // The transaction will fail if offer doesn't exist, which is safe.
        txBuilder.addOperation(Operation.manageSellOffer({
          selling: new Asset(`C${assetCode}`, config.publicKey),
          buying: config.mtlCrowdAsset,
          amount: "0", // Delete offer
          price: CROWDFUNDING_EXCHANGE_RATE,
          offerId: existingOffer.id,
        }));

        // Create new offer with updated amount
        if (remainingAmount > 0) {
          txBuilder.addOperation(Operation.manageSellOffer({
            selling: new Asset(`C${assetCode}`, config.publicKey),
            buying: config.mtlCrowdAsset,
            amount: remainingAmount.toFixed(STELLAR_DECIMAL_PLACES),
            price: CROWDFUNDING_EXCHANGE_RATE,
            offerId: "0", // New offer
          }));
        }
      }

      const transaction = txBuilder
        .setTimeout(TimeoutInfinite)
        .build();

      return transaction.toXDR();
    }),
    Effect.mapError((error: unknown): ValidationError => {
      // Check if error is ValidationError
      if (
        typeof error === "object" && error !== null && "_tag" in error
        && error._tag === "ValidationError"
      ) {
        return error as ValidationError;
      }
      return new ValidationError({
        field: "transaction",
        message: `Failed to create update transaction: ${error}`,
      });
    }),
  );

export const updateNft = () =>
  pipe(
    Effect.gen(function*() {
      yield* Effect.logInfo(chalk.blue("🔄 Updating NFT metadata...\\n"));

      // 1. Запросить asset code
      const assetCode = yield* askForAssetCode();
      yield* Effect.logInfo(chalk.cyan(`Asset code: P${assetCode}`));

      // 2. Получить текущие данные из IPFS
      yield* Effect.logInfo(chalk.blue("\\n📥 Fetching current data from IPFS..."));
      const currentData = yield* fetchProjectFromIPFS(assetCode);

      // 3. Показать текущие данные
      yield* Effect.all([
        Effect.logInfo(chalk.green("\\n✅ Current project data:")),
        Effect.logInfo(`${chalk.cyan("Name:")} ${currentData.name}`),
        Effect.logInfo(`${chalk.cyan("Code:")} ${currentData.code}`),
        Effect.logInfo(`${chalk.cyan("Description:")} ${currentData.description}`),
        Effect.logInfo(`${chalk.cyan("Contact:")} ${currentData.contact_account_id}`),
        Effect.logInfo(`${chalk.cyan("Project Account:")} ${currentData.project_account_id}`),
        Effect.logInfo(`${chalk.cyan("Target:")} ${currentData.target_amount}`),
        Effect.logInfo(`${chalk.cyan("Deadline:")} ${currentData.deadline}`),
      ]);

      // 4. Check if funding data should be added
      let dataToUpdate: ProjectData | ProjectDataWithResults = currentData;

      if ("funding_status" in currentData && currentData.funding_status !== undefined) {
        // Data already exists in IPFS
        yield* Effect.logInfo(chalk.green("\\n✅ Funding data already exists in NFT"));
      } else {
        // Try to get funding data (works for both active and closed projects)
        yield* Effect.logInfo(chalk.blue("\\n📊 Checking funding data..."));

        // First try current state
        const currentFundingData = yield* pipe(
          getCurrentFundingData(assetCode, currentData.target_amount),
          Effect.catchAll(() => Effect.succeed(null)),
        );

        // If current state shows no data (0 funded), try historical data
        let fundingData: FundingData | null = currentFundingData;
        if (
          currentFundingData === null
          || (parseFloat(currentFundingData.funded_amount) === 0 && currentFundingData.supporters_count === 0)
        ) {
          yield* Effect.logInfo(chalk.yellow("  No current data found, fetching historical data..."));
          fundingData = yield* pipe(
            getHistoricalFundingData(assetCode, currentData.target_amount),
            Effect.catchAll(() => Effect.succeed(null)),
          );
        }

        // Skip if no funding data available
        if (fundingData === null) {
          yield* Effect.logInfo(chalk.yellow("  No funding data available"));
        } else {
          const shouldAdd = yield* askToAddFundingData(fundingData);

          if (shouldAdd) {
            dataToUpdate = {
              ...currentData,
              ...(fundingData.funded_amount !== "0" ? { funded_amount: fundingData.funded_amount } : {}),
              ...(fundingData.supporters_count > 0 ? { supporters_count: fundingData.supporters_count } : {}),
              ...(fundingData.remaining_amount !== "0" ? { remaining_amount: fundingData.remaining_amount } : {}),
              ...(fundingData.supporters.length > 0 ? { supporters: fundingData.supporters } : {}),
              funding_status: fundingData.funding_status,
            };
          }
        }
      }

      // 5. Запросить обновленные данные
      yield* Effect.logInfo(chalk.blue("\\n📝 Enter updated data (press Enter to keep current value):\\n"));
      const updatedData = yield* askForUpdatedData(dataToUpdate);

      // 6. Показать JSON и запросить подтверждение
      yield* Effect.logInfo(chalk.blue("\\n📄 Data to be uploaded to IPFS:"));
      yield* Effect.logInfo(chalk.white(JSON.stringify(updatedData, null, 2)));

      const uploadConfirmed = yield* Effect.tryPromise({
        try: () =>
          prompts({
            type: "confirm",
            name: "confirmed",
            message: chalk.yellow("\\nПродолжить загрузку в IPFS?"),
            initial: true,
          }),
        catch: (error) =>
          new ValidationError({
            field: "upload_confirmation",
            message: `Failed to get confirmation: ${error}`,
          }),
      });

      if (!(uploadConfirmed as { confirmed?: boolean }).confirmed) {
        yield* Effect.logInfo(chalk.yellow("\\n⏭️  Upload cancelled"));
        return;
      }

      // 7. Загрузить в IPFS
      yield* Effect.logInfo(chalk.blue("\\n📦 Uploading to IPFS..."));
      const newCid = yield* pipe(
        PinataServiceCli,
        Effect.flatMap(service => service.upload(updatedData)),
      );
      yield* Effect.logInfo(chalk.green(`✅ New IPFS CID: ${newCid}`));

      // 6. Check if target_amount changed and show info
      const targetAmountChanged = currentData.target_amount !== updatedData.target_amount;
      if (targetAmountChanged) {
        yield* Effect.logInfo(chalk.yellow("\\n⚠️  Target amount changed! Checking current sales..."));
        const soldAmount = yield* calculateSoldAmount(assetCode);
        const soldAmountNum = parseFloat(soldAmount);
        const oldTargetNum = parseFloat(currentData.target_amount);
        const newTargetNum = parseFloat(updatedData.target_amount);
        const remainingAmount = newTargetNum - soldAmountNum;

        yield* Effect.all([
          Effect.logInfo(`${chalk.cyan("Old target:")} ${oldTargetNum}`),
          Effect.logInfo(`${chalk.cyan("New target:")} ${newTargetNum}`),
          Effect.logInfo(`${chalk.cyan("Already sold:")} ${soldAmountNum}`),
          Effect.logInfo(`${chalk.cyan("Remaining to sell:")} ${remainingAmount}`),
        ]);

        if (remainingAmount < 0) {
          yield* Effect.fail(
            new ValidationError({
              field: "target_amount",
              message: `New target (${newTargetNum}) is less than already sold (${soldAmountNum})`,
            }),
          );
        }
      }

      // 7. Создать транзакцию обновления
      yield* Effect.logInfo(chalk.blue("\\n🔗 Creating update transaction..."));
      const transactionXDR = yield* createUpdateTransaction(assetCode, currentData, updatedData, newCid);

      yield* Effect.all([
        Effect.logInfo(chalk.green("\\n✅ NFT metadata update transaction created!")),
        Effect.logInfo(`${chalk.cyan("New IPFS CID:")} ${newCid}`),
        targetAmountChanged
          ? Effect.logInfo(chalk.yellow("⚠️  Transaction includes offer update!"))
          : Effect.succeed(undefined),
        Effect.logInfo(chalk.cyan("Transaction XDR:")),
        Effect.logInfo(chalk.white(transactionXDR)),
        Effect.logInfo(chalk.yellow("\\n⚠️  Sign and submit this transaction to update the NFT metadata")),
      ]);
    }),
    Effect.catchAll(handleCliError),
  );
