import type { RestClient } from "./rest";
/** The query surface shared by the server, admin and browser clients. */
export type DbClient = { from: RestClient["from"]; rpc: RestClient["rpc"] };
