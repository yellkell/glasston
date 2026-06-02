/**
 * Integrates projectile motion each frame and despawns expired shots.
 *
 * Following the IWSDK pattern, we mutate `entity.object3D` directly for the
 * visual transform; the velocity lives in the `Projectile` component so the
 * data is queryable (collision uses it in Phase 3).
 */

import { createSystem } from '@iwsdk/core';
import { Projectile } from '../components/Projectile.js';

export class ProjectileSystem extends createSystem({
  projectiles: { required: [Projectile] },
}) {
  update(delta: number): void {
    // Snapshot to an array: destroying an entity mutates the query Set mid-loop.
    const entities = [...this.queries.projectiles.entities];
    for (const entity of entities) {
      const obj = entity.object3D;
      if (!obj) continue;

      const v = entity.getVectorView(Projectile, 'velocity'); // Float32Array [x,y,z]
      obj.position.x += v[0] * delta;
      obj.position.y += v[1] * delta;
      obj.position.z += v[2] * delta;

      const elapsed = (entity.getValue(Projectile, 'elapsed') ?? 0) + delta;
      const lifetime = entity.getValue(Projectile, 'lifetime') ?? 4;
      if (elapsed >= lifetime) {
        entity.destroy();
      } else {
        entity.setValue(Projectile, 'elapsed', elapsed);
      }
    }
  }
}
