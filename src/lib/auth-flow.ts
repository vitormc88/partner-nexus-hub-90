export interface AuthFlowState {
  hasTokens: boolean;
  isInviteFlow: boolean;
  isRecoveryFlow: boolean;
  shouldForcePasswordSetup: boolean;
}

function parseParams(input: string): URLSearchParams {
  return new URLSearchParams(input.replace(/^[?#]/, ""));
}

export function getAuthFlowState(url: Pick<Location, "hash" | "search"> = window.location): AuthFlowState {
  const hashParams = parseParams(url.hash || "");
  const searchParams = parseParams(url.search || "");

  const type = hashParams.get("type") || searchParams.get("type") || "";
  const hasTokens = Boolean(
    hashParams.get("access_token") ||
      hashParams.get("refresh_token") ||
      searchParams.get("access_token") ||
      searchParams.get("refresh_token")
  );

  const isInviteFlow = type === "invite" || type === "signup";
  const isRecoveryFlow = type === "recovery";

  return {
    hasTokens,
    isInviteFlow,
    isRecoveryFlow,
    shouldForcePasswordSetup: hasTokens || isInviteFlow || isRecoveryFlow,
  };
}

export function getResetPasswordTarget(): string {
  return `/reset-password${window.location.search || ""}${window.location.hash || ""}`;
}