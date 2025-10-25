import { SQL } from "bun";
import { log } from "utils/logger";
import { DB_URL } from ".";

export const db = new SQL({
  // Connection details (adapter is auto-detected as PostgreSQL)
  url: DB_URL,

  // Connection pool settings
  max: 20, // Maximum connections in pool
  idleTimeout: 30, // Close idle connections after 30s
  maxLifetime: 0, // Connection lifetime in seconds (0 = forever)
  connectionTimeout: 30, // Timeout when establishing new connections

  // SSL/TLS options
  // tls: true,
  // tls: {
  //   rejectUnauthorized: true,
  //   requestCert: true,
  //   ca: "path/to/ca.pem",
  //   key: "path/to/key.pem",
  //   cert: "path/to/cert.pem",
  //   checkServerIdentity(hostname, cert) {
  //     ...
  //   },
  // },

  onconnect: (client) => {
    log.info("Connected to PostgreSQL");
  },
  onclose: (client) => {
    log.info("PostgreSQL connection closed");
  },
});
