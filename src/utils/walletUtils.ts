/**
 * Updates the wallet balance in the header by dispatching a custom event
 * This is used across the application to ensure the header balance
 * is refreshed when payments are made or received
 */
export const updateWalletBalance = (): void => {
  window.dispatchEvent(new CustomEvent("wallet-balance-update"));
};