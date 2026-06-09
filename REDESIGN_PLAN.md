# Blasto UI Redesign Plan

## Overview
Complete redesign of customization and loadout systems based on user feedback. Focus on modern, intuitive interactions and pre-built options inspired by Bongo Cat.

## Issues to Address

### 1. Curve Weapons Too Weak ✓
- **Problem**: Reduced curve strength (2.5) made curve weapons ineffective
- **Solution**: Increased to 3.5 strength, 2.2 maxSwing (balanced middle ground)
- **Status**: Fixed in `src/config.ts`

### 2. Banner "Play" Text Obscured ✓
- **Problem**: "Play" text overlaps with menu elements
- **Solution**: Moved "Play" text higher (y: 150 → 120)
- **Status**: Fixed in `src/arena/banner.ts`

### 3. Customization UI - Preset System ✓
- **Problem**: Individual color pickers are confusing and messy
- **Solution**: Pre-built cat character presets (Bongo Cat style)
- **Implementation**:
  - Created `src/menu/catPresets.ts` with 8 preset cats
  - Created `src/menu/presetPanel.ts` for preset selection UI
  - Presets include: Bongo Cat, Tuxedo, Orange Tabby, Calico, Siamese, Russian Blue, Brown Tabby, White Tuxedo
- **Status**: Files created, needs integration into MenuSystem

### 4. Loadout UI - Drag & Drop / Highlight & Swap
- **Problem**: Current tap-to-cycle through 4 weapons is clunky
- **Solution**: Implement highlight-and-swap system
- **Design**:
  - Click weapon slot to highlight it (glowing border)
  - Click another weapon to swap positions
  - Visual feedback for selected slot
  - Cancel selection by clicking same slot again
- **Status**: Not started

### 5. Avatar Appearance Improvements
- **Problem**: Current cat models don't look polished enough
- **Potential Solutions**:
  - Larger, more expressive eyes
  - Better proportions (bigger head, smaller body)
  - Smoother geometry
  - Better material/shading
- **Status**: Not started

## Implementation Priority

### Phase 1: Quick Fixes (DONE)
1. ✓ Fix curve weapon strength
2. ✓ Fix banner text positioning
3. ✓ Create preset system files

### Phase 2: Preset Integration (NEXT)
1. Integrate preset panel into MenuSystem
2. Replace color picker UI with preset grid
3. Update skin loading/saving to work with presets
4. Test preset selection and preview

### Phase 3: Loadout Redesign
1. Design highlight-and-swap interaction
2. Implement selection state tracking
3. Add visual feedback (glow, border, etc.)
4. Update loadout panel rendering
5. Test weapon swapping

### Phase 4: Avatar Polish
1. Analyze current cat geometry
2. Redesign proportions and features
3. Improve eye design and placement
4. Test in VR for scale and appeal

## Technical Notes

### Preset System Architecture
```typescript
// catPresets.ts - Data
export interface CatPreset {
  id: string;
  name: string;
  description: string;
  skin: Skin;
}

// presetPanel.ts - UI
export interface PresetPanel {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  cells: PresetCell[];
  selectedId: string;
}

// Integration needed in MenuSystem.ts
- Replace customizePanel with presetPanel
- Handle preset selection actions
- Apply preset to playerSkin
- Update preview cat when preset changes
```

### Loadout Swap System Design
```typescript
// New state in MenuSystem
interface LoadoutState {
  selectedSlot: number | null; // Which slot is highlighted
  hoveredSlot: number | null;  // Which slot mouse is over
}

// New action type
type LoadoutAction = 
  | { kind: 'select'; slot: number }
  | { kind: 'swap'; fromSlot: number; toSlot: number }
  | { kind: 'cancel' };

// Visual feedback
- Selected slot: thick purple glow
- Hovered slot: subtle highlight
- Other slots: normal appearance
```

## Files Modified
- ✓ `src/config.ts` - Curve strength rebalance
- ✓ `src/arena/banner.ts` - Banner text positioning
- ✓ `src/menu/catPresets.ts` - NEW: Preset definitions
- ✓ `src/menu/presetPanel.ts` - NEW: Preset UI
- `src/systems/MenuSystem.ts` - TODO: Integrate preset panel
- `src/menu/loadoutPanel.ts` - TODO: Implement swap system
- `src/character/cat.ts` - TODO: Improve model (optional)

## Testing Checklist
- [ ] Curve weapons feel balanced in gameplay
- [ ] Banner text fully visible on all menu screens
- [ ] All 8 presets display correctly
- [ ] Preset selection updates preview cat
- [ ] Preset selection persists to localStorage
- [ ] Loadout swap interaction feels intuitive
- [ ] Weapon positions update correctly after swap
- [ ] VR controller interaction works smoothly
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Deployment works on GitHub Pages