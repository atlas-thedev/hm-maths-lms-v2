import site from "./site.json";
export const SITE = site;
export type BankAccount = (typeof site.bankAccounts)[number];
