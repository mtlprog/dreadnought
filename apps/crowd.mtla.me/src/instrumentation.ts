import { type Instrumentation } from "next";

export async function register() {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;

  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error(
      `[instrumentation] unhandledRejection: ${err.message}\n${err.stack ?? ""}`,
    );
  });

  process.on("uncaughtException", (err) => {
    console.error(
      `[instrumentation] uncaughtException: ${err.message}\n${err.stack ?? ""}`,
    );
  });
}

export const onRequestError: Instrumentation.onRequestError = (
  err,
  request,
) => {
  const error = err as Error & { digest?: string };
  const digest = error.digest != null ? ` digest=${error.digest}` : "";
  console.error(
    `[instrumentation] onRequestError ${request.method} ${request.path}${digest}: ${error.message}\n${
      error.stack ?? ""
    }`,
  );
};
