export interface AppVersionCheckState {
  currentBuildTime: string;
  notifiedBuildTime: string;
  ignoredBuildTime: string;
  isShowing: boolean;
}

export interface AppVersionMessage {
  type: 'app-version-detected';
  buildTime: string;
  sentAt: number;
}

export const appVersionMessageType: AppVersionMessage['type'] = 'app-version-detected';

export interface AppVersionHeadPrecheckState {
  lastRemoteValidator: string;
  stableHeadSkipCount: number;
  headChangedStreak: number;
  headPrecheckDisabled: boolean;
  fallbackGetThreshold: number;
}

export interface AppVersionHeadPrecheckDecision {
  shouldGetHtml: boolean;
  nextState: AppVersionHeadPrecheckState;
}

export interface AppVersionPollScheduleInput {
  now: number;
  ignoredBuildTime: string;
  lastExternalCheckTime: number;
  defaultInterval: number;
  ignoredInterval: number;
  externalDeferInterval: number;
}

export function normalizeBuildTime(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function parseBuildTimeFromHtml(html: string): string {
  const match = html.match(/<meta\s+[^>]*name=["']buildTime["'][^>]*>/i);
  if (!match) return '';

  const content = match[0].match(/\scontent=["']([^"']+)["']/i);
  return normalizeBuildTime(content?.[1]);
}

export function shouldNotifyAppUpdate(state: AppVersionCheckState, remoteBuildTime: string): boolean {
  const normalizedRemote = normalizeBuildTime(remoteBuildTime);
  const normalizedCurrent = normalizeBuildTime(state.currentBuildTime);

  if (!normalizedRemote || !normalizedCurrent) return false;
  if (normalizedRemote === normalizedCurrent) return false;
  if (normalizedRemote === state.notifiedBuildTime) return false;
  if (normalizedRemote === state.ignoredBuildTime) return false;
  if (state.isShowing) return false;

  return true;
}

export function createRemoteValidator(input: { etag?: string | null; lastModified?: string | null }): string {
  const etag = normalizeBuildTime(input.etag);
  const lastModified = normalizeBuildTime(input.lastModified);
  if (!etag && !lastModified) return '';

  return `${etag}|${lastModified}`;
}

export function decideHeadPrecheck(
  state: AppVersionHeadPrecheckState,
  remoteValidator: string
): AppVersionHeadPrecheckDecision {
  if (state.headPrecheckDisabled) {
    return {
      shouldGetHtml: true,
      nextState: state
    };
  }

  if (!remoteValidator) {
    return {
      shouldGetHtml: true,
      nextState: {
        ...state,
        stableHeadSkipCount: 0
      }
    };
  }

  if (!state.lastRemoteValidator) {
    return {
      shouldGetHtml: true,
      nextState: {
        ...state,
        lastRemoteValidator: remoteValidator,
        stableHeadSkipCount: 0
      }
    };
  }

  if (remoteValidator !== state.lastRemoteValidator) {
    return {
      shouldGetHtml: true,
      nextState: {
        ...state,
        lastRemoteValidator: remoteValidator,
        stableHeadSkipCount: 0
      }
    };
  }

  const stableHeadSkipCount = state.stableHeadSkipCount + 1;
  const shouldGetHtml = stableHeadSkipCount >= state.fallbackGetThreshold;

  return {
    shouldGetHtml,
    nextState: {
      ...state,
      stableHeadSkipCount: shouldGetHtml ? 0 : stableHeadSkipCount
    }
  };
}

export function recordHeadGetResult(
  state: AppVersionHeadPrecheckState,
  input: { validatorChanged: boolean; remoteBuildTime: string; currentBuildTime: string; unstableThreshold: number }
): AppVersionHeadPrecheckState {
  if (state.headPrecheckDisabled || !input.validatorChanged) return state;

  const remoteBuildTime = normalizeBuildTime(input.remoteBuildTime);
  const currentBuildTime = normalizeBuildTime(input.currentBuildTime);
  if (!remoteBuildTime || !currentBuildTime || remoteBuildTime !== currentBuildTime) {
    return {
      ...state,
      headChangedStreak: 0
    };
  }

  const headChangedStreak = state.headChangedStreak + 1;

  return {
    ...state,
    headChangedStreak,
    headPrecheckDisabled: headChangedStreak >= input.unstableThreshold
  };
}

export function resolveNextPollDelay(input: AppVersionPollScheduleInput): number {
  const baseInterval = input.ignoredBuildTime ? input.ignoredInterval : input.defaultInterval;
  const nextByInterval = input.now + baseInterval;
  const nextByExternalDefer = input.lastExternalCheckTime
    ? input.lastExternalCheckTime + input.externalDeferInterval
    : 0;

  return Math.max(nextByInterval, nextByExternalDefer) - input.now;
}

export function createAppVersionMessage(buildTime: string, sentAt = Date.now()): AppVersionMessage {
  return {
    type: appVersionMessageType,
    buildTime,
    sentAt
  };
}

export function parseAppVersionMessage(value: string | null): AppVersionMessage | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AppVersionMessage>;
    if (parsed.type !== appVersionMessageType || typeof parsed.buildTime !== 'string') return null;

    return {
      type: appVersionMessageType,
      buildTime: parsed.buildTime,
      sentAt: typeof parsed.sentAt === 'number' ? parsed.sentAt : 0
    };
  } catch {
    return null;
  }
}
