import { SQL } from "bun";

export const db = new SQL({
  // Connection details (adapter is auto-detected as PostgreSQL)
  // url: "postgres://user:pass@localhost:5432/dbname",

  // Alternative connection parameters
  hostname: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  username: process.env.PGUSERNAME,
  password: process.env.PGPASSWORD,

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
    console.log("Connected to PostgreSQL");
  },
  onclose: (client) => {
    console.log("PostgreSQL connection closed");
  },
});
