# Blasto - Kawaii Cat Theme Transformation Plan

## Overview
Transform **Glasston** into **Blasto** - a kawaii cat-themed XR dueling shooter that maintains the core glassmorphic aesthetic while adding adorable cat elements, animated expressions, and playful UI.

## Design Philosophy
- **Maintain Core Gameplay**: Keep the slow-motion dodging mechanics and dual-wielding combat
- **Kawaii Aesthetic**: Add cute cat elements without overwhelming the glassmorphic style
- **Animated Expressions**: Dynamic cat faces that react to gameplay events
- **Playful UI**: Cat-themed interface elements (paw prints, ears, whiskers, fish icons)

---

## 1. Branding Updates

### Name Changes
- [x] Repository name: `glasston` → Keep as is (URL constraint)
- [ ] Display name: "GLASSTON" → "BLASTO" 
- [ ] Update all UI text references
- [ ] Update README.md and documentation

### Files to Update
- `src/hud/hud.ts` - Line 105: Change "G L A S S T O N" to "B L A S T O"
- `package.json` - Update name and description
- `README.md` - Update title and description
- `PLAN.md` - Add note about Blasto theme

---

## 2. Kawaii Cat Color Palette

### New Color Scheme
```typescript
export const KAWAII_PALETTE = {
  // Pastel backgrounds
  background: 0x1a1625,        // Deep purple-black
  skyGradientTop: 0x4a3a5c,    // Soft purple
  skyGradientBottom: 0x2a1f3d, // Dark purple
  
  // Cat-themed accents
  catPink: 0xffb3d9,           // Soft pink (nose, paws)
  catOrange: 0xffcc99,         // Peachy orange (fur highlights)
  catWhite: 0xfff5f0,          // Cream white (belly, face)
  catGray: 0xb8b8c8,           // Soft gray (secondary fur)
  
  // Neon accents (keep some glassmorphic elements)
  neonPink: 0xff69b4,          // Hot pink
  neonCyan: 0x7fffd4,          // Aquamarine
  neonPurple: 0xda70d6,        // Orchid
  
  // UI elements
  healthPlayer: 0x98d8ff,      // Light blue
  healthEnemy: 0xffb3d9,       // Pink
  scoreGold: 0xffd700,         // Gold
  
  // Weapon themes
  yarnBall: 0xff6b9d,          // Pink yarn
  fishBlue: 0x87ceeb,          // Sky blue fish
  catnipGreen: 0x90ee90,       // Light green
};
```

---

## 3. Cat Expression System

### Expression Types
1. **😊 Happy** - Default/idle, winning rounds
2. **😮 Surprised** - Taking damage, near-miss dodges
3. **😤 Determined** - Firing weapons, low health
4. **😸 Playful** - Successful hits, grabbing weapons
5. **😿 Sad** - Losing rounds, defeated
6. **😼 Confident** - High health, winning streak

### Implementation Approach

#### Component: `CatExpression`
```typescript
export const CatExpression = createComponent(
  'CatExpression',
  {
    current: { type: Types.String, default: 'happy' },
    transitionTimer: { type: Types.Float32, default: 0 },
    blinkTimer: { type: Types.Float32, default: 0 },
  }
);
```

#### System: `CatExpressionSystem`
- Monitors game events (damage, hits, health changes)
- Triggers expression transitions
- Handles automatic blinking animation
- Returns to default expression after duration

### Visual Implementation Options

**Option A: Canvas-based 2D Faces**
- Draw cat faces on canvas textures
- Animate using sprite sheets or procedural drawing
- Attach to floating panels above player/AI heads
- **Pros**: Easy to implement, performant, clear expressions
- **Cons**: Less immersive, 2D in 3D space

**Option B: 3D Geometry Morphing**
- Create 3D cat head models with blend shapes
- Morph between expression states
- **Pros**: More immersive, fits glassmorphic aesthetic
- **Cons**: More complex, requires 3D modeling

**Recommended: Option A** for faster implementation and better readability in VR

---

## 4. Kawaii UI Elements

### HUD Redesign (`src/hud/hud.ts`)

#### Title Area
- Replace "GLASSTON" with "BLASTO" in kawaii font style
- Add small cat ear decorations on corners
- Paw print watermark in background

#### Health Bars
- **Player Bar**: Blue with cat paw icon
- **Enemy Bar**: Pink with cat face icon
- Add whisker decorations on bar ends
- Rounded, softer edges (more kawaii)

#### Score Display
- Fish icons instead of numbers for visual scoring
- Cat paw prints for round indicators
- Yarn ball icon for timer

#### Status Messages
- Add cat emoji/icons to messages
- "MEOW-VELOUS!" for wins
- "PAW-SOME!" for good hits
- "FUR-TUNATE ESCAPE!" for dodges

### Canvas Drawing Additions
```typescript
// Cat ear decoration
function drawCatEar(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size/2, y);
  ctx.lineTo(x + size, y + size);
  ctx.closePath();
  // Gradient fill with pink inner
}

// Paw print
function drawPawPrint(ctx, x, y, size) {
  // Main pad (large circle)
  // Four toe pads (small circles)
}

// Cat whiskers
function drawWhiskers(ctx, x, y, length) {
  // Three lines on each side
}
```

---

## 5. Cat-Themed Projectiles

### Weapon Archetypes Update

#### Pistol → Yarn Ball Launcher
- **Visual**: Pink/purple yarn ball with trailing string
- **Trail**: Unwinding yarn effect
- **Impact**: Yarn explosion with string particles

#### Spread → Fish Bones
- **Visual**: Multiple small fish skeleton projectiles
- **Trail**: Bubble particles
- **Impact**: Fish bone scatter

#### Heavy → Catnip Bomb
- **Visual**: Large glowing green catnip ball
- **Trail**: Green sparkle particles
- **Impact**: Catnip cloud burst

### Implementation
```typescript
// Update in weapons/archetypes.ts
export const YARN_BALL: WeaponArchetype = {
  name: 'Yarn Ball',
  maxAmmo: 8,
  cooldown: 0.4,
  projectileCount: 1,
  spread: 0,
  projectileSpeed: 4.0,
  damage: 10,
  color: 0xff69b4, // Hot pink
  glowIntensity: 1.2,
};
```

---

## 6. Cat Avatar System

### Player & AI Cat Avatars

#### Visual Components
1. **Cat Head** - Floating above player position
   - Rounded sphere with ears
   - Animated expression face
   - Whiskers extending from sides

2. **Cat Ears** - Triangular geometry
   - Pink inner ear detail
   - Slight animation (twitch, rotate)

3. **Cat Tail** - Optional decorative element
   - Curved geometry behind player
   - Gentle swaying animation

#### Implementation Files
- `src/components/CatAvatar.ts` - Component definition
- `src/systems/CatAvatarSystem.ts` - Update positions, expressions
- `src/avatar/catGeometry.ts` - 3D geometry creation

---

## 7. Particle Effects & Visual Juice

### New Cat-Themed Effects

#### Paw Print Trails
- Leave temporary paw prints when moving
- Fade out over time
- Soft glow effect

#### Meow Particles
- Emit on weapon fire
- Musical note shapes with "meow" text
- Float upward and fade

#### Cat Emoji Reactions
- Float above head on events
- Heart eyes on good hits
- Sweat drops on near misses
- Stars on critical hits

#### Yarn Trail Enhancement
- Projectiles leave unwinding yarn
- Yarn persists briefly then fades
- Colorful, matches projectile color

---

## 8. Sound Design (Future Phase)

### Cat Sound Effects
- **Weapon Fire**: Playful "pew" with meow undertone
- **Hit Impact**: Soft "mew" of surprise
- **Dodge Success**: Happy chirp
- **Round Win**: Triumphant meow melody
- **Round Loss**: Sad meow
- **Ambient**: Soft purring background

---

## 9. Arena Theming

### Environmental Updates

#### Floor Grid
- Replace neon grid with paw print pattern
- Soft pastel colors
- Occasional animated paw prints walking across

#### Pedestals
- Add cat ear decorations on top
- Paw print base design
- Soft pink/purple glow instead of orange

#### Lighting
- Warmer, softer tones
- Pink and purple spotlights
- Less harsh, more playful

#### Background Elements
- Floating cat silhouettes in distance
- Yarn ball decorations
- Fish mobile hanging elements

---

## 10. Implementation Phases

### Phase 1: Core Branding & UI (Priority)
- [ ] Update all "GLASSTON" → "BLASTO" text
- [ ] Implement kawaii color palette in config
- [ ] Redesign HUD with cat motifs
- [ ] Add paw print and cat ear decorations
- [ ] Update health bar styling

### Phase 2: Expression System
- [ ] Create CatExpression component
- [ ] Implement CatExpressionSystem
- [ ] Design canvas-based cat face sprites
- [ ] Add expression triggers for game events
- [ ] Test expression transitions

### Phase 3: Cat Avatars
- [ ] Create cat head geometry
- [ ] Add cat ears with animation
- [ ] Position avatars above player/AI
- [ ] Link expressions to avatars
- [ ] Add blinking animation

### Phase 4: Projectile Theming
- [ ] Redesign projectile visuals (yarn, fish, catnip)
- [ ] Update weapon names and descriptions
- [ ] Add themed particle trails
- [ ] Update impact effects

### Phase 5: Environmental Polish
- [ ] Update arena floor pattern
- [ ] Restyle pedestals with cat theme
- [ ] Adjust lighting for warmer tones
- [ ] Add decorative cat elements

### Phase 6: Particle Effects & Juice
- [ ] Implement paw print trails
- [ ] Add meow particles on fire
- [ ] Create cat emoji reactions
- [ ] Enhanced yarn trails

---

## 11. Technical Considerations

### Performance
- Keep cat avatars low-poly for VR performance
- Use instanced geometry for repeated elements (paw prints)
- Limit particle count to maintain 72+ FPS
- Use texture atlases for cat expressions

### VR Comfort
- Ensure cat elements don't obstruct view
- Keep expressions readable at distance
- Avoid overwhelming visual noise
- Maintain clear gameplay feedback

### Accessibility
- High contrast for important UI elements
- Clear visual hierarchy
- Readable text sizes
- Color-blind friendly palette options

---

## 12. File Structure

```
src/
├── avatar/
│   ├── catGeometry.ts       # 3D cat head/ears geometry
│   └── expressionSprites.ts # Canvas-based face drawing
├── components/
│   ├── CatAvatar.ts         # Cat avatar component
│   └── CatExpression.ts     # Expression state component
├── systems/
│   ├── CatAvatarSystem.ts   # Avatar positioning & rendering
│   └── CatExpressionSystem.ts # Expression state machine
├── config.ts                # Add KAWAII_PALETTE
├── hud/
│   └── hud.ts              # Redesign with cat motifs
└── fx/
    └── catEffects.ts       # Paw prints, meow particles
```

---

## 13. Success Criteria

### Must Have
- ✅ All "GLASSTON" references changed to "BLASTO"
- ✅ Kawaii color palette implemented
- ✅ Cat-themed HUD with paw prints and decorations
- ✅ Basic cat expression system (3+ expressions)
- ✅ Cat avatars visible on player and AI

### Should Have
- Cat-themed projectiles (yarn, fish, catnip)
- Animated expressions responding to gameplay
- Paw print particle effects
- Updated arena theming

### Nice to Have
- Advanced expression animations (blinking, ear twitching)
- Cat sound effects
- Floating cat emoji reactions
- Yarn trail effects

---

## Next Steps

1. **Start with Phase 1**: Update branding and create kawaii HUD
2. **Get feedback**: Test the new aesthetic in VR
3. **Iterate**: Refine based on visual appeal and readability
4. **Expand**: Add expression system and avatars
5. **Polish**: Add particle effects and environmental theming

---

*This plan maintains the core Glasston gameplay and glassmorphic aesthetic while layering on kawaii cat charm. The result will be a unique, playful VR dueling experience that's both technically impressive and adorably fun!* 🐱✨