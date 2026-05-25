function readBool(value) {
  if (value && typeof value === 'object' && 'value' in value) {
    return Boolean(value.value);
  }
  return Boolean(value);
}

function isSearchPhase(status = {}) {
  return status.phase === 'searching' || status.phase === 'matched';
}

export function usePvpBattleFlow({
  resetPvpTerminalState,
  applyMatchStatus,
  matchmakingStatus,
  isGameCenterProvider,
  gameCenterSession,
  resetPvpRealtimeState,
  matchService,
  resolveLocalPvpDisplayName,
  playerConfig,
  buildFilledSkillIds,
  currentScreen
} = {}) {
  function openMatchmaking() {
    resetPvpTerminalState('open_matchmaking');
    console.info('PvP page opened, checking existing GameCenter session only');
    console.info('PvP checks existing GameCenter session');
    currentScreen.value = 'matchmaking';
    if (!readBool(isGameCenterProvider)) return;
    if (gameCenterSession.isAuthenticated) return;
    if (isSearchPhase(matchmakingStatus)) return;
    applyMatchStatus({
      ...matchmakingStatus,
      phase: 'auth_required',
      message: '請先到主畫面設定頁面連接 Game Center。',
      errorMessage: ''
    });
  }

  async function startPvPMatchmaking() {
    resetPvpTerminalState('start_matchmaking');
    console.info('PvP start matchmaking clicked');
    if (readBool(isGameCenterProvider) && !gameCenterSession.isAuthenticated) {
      console.info('PvP blocked: Game Center not authenticated');
      applyMatchStatus({
        ...matchmakingStatus,
        phase: 'auth_required',
        message: '請先到主畫面設定頁面連接 Game Center。',
        errorMessage: ''
      });
      return;
    }
    resetPvpRealtimeState();
    console.info('startMatchmaking only after PvP button clicked');
    await matchService.startMatchmaking({
      displayName: resolveLocalPvpDisplayName(),
      characterId: playerConfig.characterId,
      equippedSkillIds: buildFilledSkillIds(playerConfig.equippedSkillIds)
    });
  }

  async function cancelPvPMatchmaking() {
    resetPvpRealtimeState();
    await matchService.cancelMatchmaking();
  }

  async function goHomeFromMatchmaking() {
    if (isSearchPhase(matchmakingStatus)) {
      resetPvpRealtimeState();
      await matchService.cancelMatchmaking();
    }
    resetPvpTerminalState('go_home_from_matchmaking');
    currentScreen.value = 'battleMode';
  }

  return {
    openMatchmaking,
    startPvPMatchmaking,
    cancelPvPMatchmaking,
    goHomeFromMatchmaking
  };
}
