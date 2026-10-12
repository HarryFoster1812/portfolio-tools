<script lang="ts">
    import { goto } from "$app/navigation";
    import { resolve } from '$app/paths';
    import { gameState } from "./lib/gameState.svelte";
    import { Player } from "./types/Player.svelte";

    let game = $derived(gameState.game);
    let mainPlayer = $derived(game.mainPlayer);

    function setPlayerCount(num: number) {
        console.log(game.players.length);
        if (game.players.length == num) {
            return;
        } else if (game.players.length > num) {
            game.removePlayersTo(num);
        } else {
            let players_to_add = num - game.players.length;
            for (let i = 0; i < players_to_add; i++) {
                let temp_player = new Player(`Player ${game.players.length}`);
                game.addPlayer(temp_player);
            }
        }
    }
</script>

<div class="screen">
    <!-- Status Bar (Optional / Placeholder) -->
    
    <!-- Screen Content -->
    <div class="screen-content">
        
        <!-- Screen Header -->
        <div class="screen-header">
            <div class="heading">
                <div class="title">New game</div>
                <div class="subtitle">Setup</div>
            </div>
            <button class="header-action" onclick={() => {goto(resolve("/"))}}>
                X
            </button>
        </div>

        <div class="description">
            Configure your players, starting knowledge, and house rules before beginning.
        </div>

        <!-- Player Count Section -->
        <div class="player-count-section">
            <div class="section-heading">
                <div class="title">Player count</div>
                <div class="secondary-action">Select size</div>
            </div>
            <div class="count-choices">
                {#each [2, 3, 4, 5, 6] as countNum (countNum)}
                    <button 
                        class="player-count-choice {game.players.length === countNum ? 'active' : ''}"
                        onclick={() => setPlayerCount(countNum)}
                    >
                        <span class="count">{countNum}</span>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Player Identities Section -->
        <div class="player-identities-section">
            <div class="section-heading">
                <div class="title">Player identities</div>
                <div class="secondary-action">Manage seats</div>
            </div>
            <div class="player-list">
                {#each game.players as player, index (index)}
                    <div class="player-identity">
                        <div class="player-avatar {mainPlayer === player ? 'active' : ''}">
                            <span class="initials">{player.name.charAt(0)}</span>
                        </div>
                        <div class="player-name"><input type="text" bind:value={player.name}/></div>
                        <div class="seat-label {mainPlayer === player ? 'active' : ''}">
                            {index === 0 ? 'Seat 1' : `Seat ${index + 1}`}
                        </div>
												<button onclick={() => {game.mainPlayer = player}}>
													<div class="choose-own-seat {mainPlayer === player  ? 'active' : ''}"></div>
												</button>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Starting Knowledge Section (Cards Example) -->
        <div class="starting-knowledge-section">
            <div class="section-heading">
                <div class="title">Starting knowledge</div>
                <div class="secondary-action">Hand view</div>
            </div>
            <div class="physical-hand-capture">
                <div class="starting-arrangement">
                    <div class="hand-row">
                        <div class="hand-card dark">
                            <span class="physical-position">3 TL</span>
                            <div class="known-value">
                                <span class="rank unknown">?</span>
                            </div>
                            <span class="knowledge-state">Hidden</span>
                        </div>
                        <div class="hand-card dark">
                            <span class="physical-position">4 TR</span>
                            <div class="known-value">
                                <span class="rank unknown">?</span>
                            </div>
                            <span class="knowledge-state">Hidden</span>
                        </div>
                    </div>
                    <div class="hand-row">
                        <div class="hand-card">
                            <span class="physical-position">1 BL</span>
                            <div class="known-value">
                                <span class="rank">7</span>
                                <div class="suit"></div>
                            </div>
                            <span class="knowledge-state">Known</span>
                        </div>
                        <div class="hand-card">
                            <span class="physical-position">2 BR</span>
                            <div class="known-value">
                                <span class="rank red">4</span>
                                <div class="suit red"></div>
                            </div>
                            <span class="knowledge-state">Known</span>
                        </div>
                    </div>
                </div>
                <div class="capture-guidance">
                    <div class="status-badge">
                        <span class="label">Synced</span>
                    </div>
                    <div class="description">Position your physical hand layout to match the digital setup.</div>
                </div>
            </div>
        </div>

        <!-- House Rules Section -->
        <div class="house-rules-section">
            <div class="section-heading">
                <div class="title">House rules</div>
                <div class="secondary-action">Customize</div>
            </div>
            <div class="rule-summary">
                <div class="rule-row">
                    <span class="rule-title">Deck and sticking</span>
                    <div class="status-badge">
                        <span class="label">Standard</span>
                    </div>
                </div>
                <div class="divider"></div>
                <div class="rule-row">
                    <span class="rule-title">Special-card rules</span>
                    <span class="rule-config">Enabled</span>
                </div>
                <div class="rule-row">
                    <span class="rule-title">Penalty rules</span>
                    <span class="rule-config">Strict</span>
                </div>
            </div>
        </div>

        <!-- Start Game Button -->
        <div class="start-game-section">
            <button class="action-button" onclick={() => goto(resolve('/cambio/game'))}>
                <span class="label">Start game</span>
            </button>
            <div class="description small" style="text-align: center;">Make sure all player configurations are set.</div>
        </div>

    </div>
</div>

<style>
.screen-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background: #0b0f15;
  padding: 24px;
  box-sizing: border-box;
}

.screen {
  display: flex;
  flex-direction: column;
  align-self: center;
  gap: 24px;
  width: 100%;
  max-width: 1000px;
  background: #10161E;
  border-radius: 24px;
  padding: 32px;
  box-sizing: border-box;
}

/* Two-column grid layout for tablets and desktops */
.setup-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  width: 100%;
}

@media (min-width: 768px) {
  .setup-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.setup-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

/* --- Screen Header --- */
.screen-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex-grow: 1;
}

.heading .title {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 24px;
  line-height: 29px;
  color: #F5F4EE;
}

.heading .subtitle {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 13px;
  line-height: 15px;
  color: #ACB8C7;
}

.header-action {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 44px;
	cursor:pointer;
  height: 44px;
  background: #19222D;
  border-radius: 12px;
  flex-shrink: 0;
}

.description {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 15px;
  line-height: 145%;
  color: #F5F4EE;
  width: 100%;
}

.description.small {
  font-size: 12px;
  color: #ACB8C7;
}

/* --- Section Headings --- */
.section-heading {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 12px;
}

.section-heading .title {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 16px;
  line-height: 19px;
  color: #F5F4EE;
}

.section-heading .secondary-action {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 15px;
  color: #B9E4C8;
  cursor: pointer;
}

/* --- Player Count Choices --- */
.player-count-section {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.count-choices {
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
}

.player-count-choice {
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 52px;
  background: #19222D;
  border: 1px solid #344252;
  border-radius: 12px;
  flex: 1;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.player-count-choice.active {
  background: #B9E4C8;
  border-color: #B9E4C8;
}

.player-count-choice.active .count {
  color: #182332;
}

.player-count-choice .count {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 20px;
  color: #F5F4EE;
}

/* --- Player Identities & List --- */
.player-identities-section {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.player-list {
  display: flex;
  flex-direction: column;
  padding: 0px 14px;
  background: #19222D;
  border-radius: 18px;
  width: 100%;
  box-sizing: border-box;
}

.player-identity {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  height: 57px;
  border-bottom: 1px solid #344252;
  width: 100%;
}

.player-identity:last-child {
  border-bottom: none;
}

.player-avatar {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  background: #222E3B;
  border-radius: 100px;
  flex-shrink: 0;
}

.player-avatar.active {
  background: #B9E4C8;
}

.player-avatar.active .initials {
  color: #182332;
}

.player-avatar .initials {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 12px;
  color: #ACB8C7;
}

.player-name {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 15px;
  color: #F5F4EE;
  flex-grow: 1;
  white-space: nowrap;
	min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-name input {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 15px;
  color: #F5F4EE;
  box-sizing: border-box;
}

.player-name input:hover,
.player-name input:focus {
  background: #222E3B;
  border-color: #344252;
  outline: none;
}

.seat-label {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 11px;
  color: #ACB8C7;
  flex-shrink: 0;
}

.seat-label.active {
  color: #B9E4C8;
}

.seat-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.choose-own-seat {
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  width: 26px;
  height: 26px;
  border: 1px solid #344252;
  border-radius: 100px;
  position: relative;
	cursor: pointer;
}

.choose-own-seat.active {
  background: #1B382E;
  border-color: #B9E4C8;
}

/* --- Starting Knowledge / Cards Section --- */
.starting-knowledge-section {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.physical-hand-capture {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16px;
  gap: 16px;
  background: #19222D;
  border-radius: 18px;
  width: 100%;
  box-sizing: border-box;
}

.starting-arrangement {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.hand-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

/* Hand Card Styles */
.hand-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px;
  width: 68px;
  height: 88px;
  background: #F2EEE5;
  border: 1px solid #C8C4BB;
  box-shadow: 0px 3px 5px rgba(0, 0, 0, 0.207843);
  border-radius: 7px;
}

.hand-card.dark {
  background: #222E3B;
  border: 1px solid #344252;
}

.hand-card .physical-position {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 9px;
  color: #647080;
}

.hand-card.dark .physical-position {
  color: #76889E;
}

.hand-card .known-value {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1px;
  width: 100%;
  height: 34px;
}

.hand-card .rank {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 27px;
  color: #182332;
}

.hand-card .rank.red {
  color: #B8494C;
}

.hand-card .rank.unknown {
  color: #ACB8C7;
}

.hand-card .suit {
  width: 22px;
  height: 22px;
  background: #182332;
}

.hand-card .suit.red {
  background: #B8494C;
}

.hand-card .knowledge-state {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 9px;
  text-align: center;
  width: 100%;
  color: #647080;
}

.hand-card.dark .knowledge-state {
  color: #ACB8C7;
}

/* Capture Guidance / Status Badges */
.capture-guidance {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-grow: 1;
}

.status-badge {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 5px 8px;
  background: #1B382E;
  border-radius: 100px;
  width: fit-content;
}

.status-badge .label {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 10px;
  color: #B9E4C8;
}

/* --- House Rules --- */
.house-rules-section {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.rule-summary {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 10px;
  background: #19222D;
  border-radius: 18px;
  width: 100%;
  box-sizing: border-box;
}

.rule-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.rule-row .rule-title {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 13px;
  color: #F5F4EE;
}

.rule-row .rule-config {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 12px;
  color: #B9E4C8;
}

.divider {
  width: 100%;
  height: 1px;
  background: #344252;
}

/* --- Start Game Button Action --- */
.start-game-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.action-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0px 16px;
  gap: 8px;
  width: 100%;
  height: 52px;
  background: #B9E4C8;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.action-button:hover {
  opacity: 0.9;
}

.action-button .label {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 15px;
  color: #182332;
}

/* Mobile small screen adjustments */
@media (max-width: 480px) {
  .screen-wrapper {
    padding: 0;
  }
  .screen {
    border-radius: 0;
    padding: 16px;
  }
  .physical-hand-capture {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
