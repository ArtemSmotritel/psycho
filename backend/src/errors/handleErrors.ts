import { SQL } from "bun";
import { HTTP_STATUS } from "utils/index";
import { log } from "utils/logger";

export const handleErrors = ({ error }: any) => {
  if (error instanceof SQL.PostgresError) {
    // PostgreSQL-specific error
    log.error(error.detail || "A PostgresError has happened", { error });
  }

  log.error("An error occurred", error);

  return new Response(error.toString(), { status: HTTP_STATUS.INTERNAL });
};
