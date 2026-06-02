/**
 * Animates transient effects (flashes, shards, rings) and drives the ambient
 * emissive "breathing" pulse on neon accents.
 */

import { createSystem } from '@iwsdk/core';
import { Effect, EffectKind } from '../components/Effect.js';
import { pulseAll } from '../materials/pulse.js';

const GRAVITY = 4.5;

type Fadable = { opacity: number; transparent: boolean };

export class FXSystem extends createSystem({
  effects: { required: [Effect] },
}) {
  private time = 0;

  update(delta: number): void {
    this.time += delta;
    pulseAll(this.time);

    for (const e of [...this.queries.effects.entities]) {
      const obj = e.object3D;
      if (!obj) continue;

      const age = (e.getValue(Effect, 'age') ?? 0) + delta;
      const life = e.getValue(Effect, 'life') ?? 0.3;
      if (age >= life) {
        e.destroy();
        continue;
      }
      e.setValue(Effect, 'age', age);

      const t = age / life;
      const base = e.getValue(Effect, 'baseScale') ?? 1;
      const mat = (obj as unknown as { material?: Fadable }).material;

      switch (e.getValue(Effect, 'kind')) {
        case EffectKind.Flash:
          obj.scale.setScalar(base * (1 + t * 1.8));
          if (mat) mat.opacity = 1 - t;
          break;
        case EffectKind.Ring:
          obj.scale.setScalar(base * (1 + t * 6));
          if (mat) mat.opacity = 0.8 * (1 - t) * (1 - t);
          break;
        case EffectKind.Shard: {
          const v = e.getVectorView(Effect, 'velocity');
          obj.position.x += v[0] * delta;
          obj.position.y += v[1] * delta;
          obj.position.z += v[2] * delta;
          v[1] -= GRAVITY * delta;
          const spin = e.getValue(Effect, 'spin') ?? 0;
          obj.rotation.x += spin * delta;
          obj.rotation.y += spin * delta;
          obj.scale.setScalar(base * (1 - t));
          if (mat) mat.opacity = 1 - t;
          break;
        }
      }
    }
  }
}
