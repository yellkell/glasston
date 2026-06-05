/**
 * Owns the match: round timer, scoring, win/lose and reset. Reads/writes the
 * shared `match` state and refreshes the HUD each frame.
 *
 * Round ends when a combatant's Health hits 0 (knockout) or the timer expires
 * (higher Health wins). First to MATCH.winTarget round wins takes the match;
 * the match then resets after a pause.
 */

import { createSystem, type Entity } from '@iwsdk/core';
import { Combatant } from '../components/Combatant.js';
import { Health } from '../components/Health.js';
import { Projectile } from '../components/Projectile.js';
import { AIController } from '../components/AIController.js';
import { match } from '../combat/matchState.js';
import { app } from '../menu/appState.js';
import { AI, MATCH } from '../config.js';
import { createHud, type Hud } from '../hud/hud.js';

interface Combatants {
  player: Entity;
  opp: Entity;
}

export class GameStateSystem extends createSystem({
  combatants: { required: [Combatant, Health] },
  projectiles: { required: [Projectile] },
}) {
  private hud?: Hud;
  private wasPlaying = false;

  init(): void {
    this.hud = createHud(this.scene);
    this.hud.setVisible(false); // hidden in the lobby
  }

  update(delta: number): void {
    // Only run the match while a game is live; otherwise sit dormant in the lobby.
    if (app.state !== 'playing') {
      this.hud?.setVisible(false);
      this.wasPlaying = false;
      return;
    }

    const c = this.findCombatants();
    if (!c) return;

    // Entering a match: reset scores/round/health and kick off round 1.
    if (!this.wasPlaying) {
      this.startMatch(c);
      this.hud?.setVisible(true);
      this.wasPlaying = true;
    }

    const pHp = c.player.getValue(Health, 'current') ?? 0;
    const pMax = c.player.getValue(Health, 'max') ?? 1;
    const oHp = c.opp.getValue(Health, 'current') ?? 0;
    const oMax = c.opp.getValue(Health, 'max') ?? 1;

    if (match.phase === 'playing') {
      match.roundTimer = Math.max(0, match.roundTimer - delta);
      if (oHp <= 0) this.endRound('player');
      else if (pHp <= 0) this.endRound('ai');
      else if (match.roundTimer <= 0) this.endRound(pHp >= oHp ? 'player' : 'ai');
    } else {
      match.resultTimer -= delta;
      if (match.resultTimer <= 0) {
        if (match.phase === 'roundOver') {
          if (match.playerScore >= MATCH.winTarget || match.aiScore >= MATCH.winTarget) {
            this.toMatchOver();
          } else {
            match.round += 1;
            this.beginRound(c);
          }
        } else {
          // matchOver → back to the lobby menu.
          app.state = 'menu';
          this.wasPlaying = false;
        }
      }
    }

    this.hud?.update(match, pHp, pMax, oHp, oMax);
  }

  private endRound(winner: 'player' | 'ai'): void {
    if (winner === 'player') match.playerScore += 1;
    else match.aiScore += 1;
    match.phase = 'roundOver';
    match.resultTimer = MATCH.roundOverDelay;
    match.message = winner === 'player' ? 'ROUND WON' : 'ROUND LOST';
  }

  private toMatchOver(): void {
    match.phase = 'matchOver';
    match.resultTimer = MATCH.matchOverDelay;
    match.message = match.playerScore > match.aiScore ? 'YOU WIN THE MATCH' : 'YOU LOSE';
  }

  private startMatch(c: Combatants): void {
    match.playerScore = 0;
    match.aiScore = 0;
    match.round = 1;
    this.beginRound(c);
  }

  private beginRound(c: Combatants): void {
    for (const e of [c.player, c.opp]) {
      e.setValue(Health, 'current', e.getValue(Health, 'max') ?? 100);
    }
    // Reset opponent to centre and re-arm its AI.
    if (c.opp.object3D) c.opp.object3D.position.x = 0;
    c.opp.setValue(AIController, 'fireTimer', AI.fireInterval);
    c.opp.setValue(AIController, 'moveTimer', 1);
    c.opp.setValue(AIController, 'targetX', 0);

    for (const p of [...this.queries.projectiles.entities]) p.destroy();

    match.roundTimer = MATCH.roundTime;
    match.resultTimer = 0;
    match.message = '';
    match.phase = 'playing';
  }

  private findCombatants(): Combatants | null {
    let player: Entity | undefined;
    let opp: Entity | undefined;
    for (const e of this.queries.combatants.entities) {
      if ((e.getValue(Combatant, 'team') ?? 0) === 0) player = e;
      else opp = e;
    }
    return player && opp ? { player, opp } : null;
  }
}
