<!-- 71a77a8d-132f-42f7-b32c-5c9a82bedf75 80f242d2-feb8-44e3-bd1b-8e0ae6a0a096 -->
# ZK Quest - 3D Gamified Zero-Knowledge Proof Playground

## Architecture Overview

The implementation extends BuildO with:

- **3D Game Engine**: React Three Fiber (Three.js) for immersive 3D interactive experiences
- **Game State System**: Tracks progression, XP, achievements, and completed levels
- **ZK Circuit Backend**: Circom compiler integration for proof generation/verification
- **3D Visual Game Engine**: Interactive 3D components for World 1 (concept teaching with immersive graphics)
- **3D Circuit Visualization**: 3D representation of circuits, proofs, and cryptographic operations
- **Circuit Editor**: Monaco with Circom language support for World 2
- **Hedera Integration**: HCS for proof submission, NFT achievements, leaderboard
- **AI ZK Tutor**: Extends existing agent system to guide circuit building

## Implementation Tasks

### Phase 1: Foundation & Game State (Day 1 - Morning)

**Task 1.1: Game State Management System**

- Create `frontend/lib/game-state.ts` with TypeScript interfaces
- Implement localStorage persistence with migration support
- Create `frontend/hooks/use-game-state.ts` React hook
- Add game state API endpoints in backend

**Task 1.2: ZK Backend Module Structure**

- Create `backend/src/modules/zk/` directory structure
- Add route to app.controller.ts
- Install dependencies: `circom`, `circomlib`, `snarkjs` in backend

**Task 1.3: 3D Game UI Shell & Navigation**

- Create `frontend/app/zk-quest/page.tsx` as main game route
- Build `frontend/components/zk-quest/GameShell.tsx` with 3D ambient background
- Create `frontend/components/zk-quest/WorldMap.tsx` - 3D interactive world map with clickable level markers
- Add routing from main page to ZK Quest
- Install React Three Fiber dependencies: `@react-three/fiber`, `@react-three/drei`, `three`, `@react-spring/three`

### Phase 2: World 1 - 3D Visual Games (Day 1 - Afternoon)

**Task 2.1: Level 1 - Color Game (3D)**

- Create `frontend/components/zk-quest/levels/ColorGame.tsx` using React Three Fiber
- Build 3D scene with two 3D spheres (balls) that can be swapped
- 3D hands/containers that hold the balls
- Camera animations for dramatic reveals
- Particle effects on success
- Interactive ball swapping with physics
- Call Hedera API to mint "Prover Badge" NFT on completion

**Task 2.2: Level 2 - Cave Challenge (3D)**

- Create `frontend/components/zk-quest/levels/CaveChallenge.tsx` using React Three Fiber
- Build immersive 3D cave environment with two branching paths
- 3D character/avatar that navigates the cave
- Dynamic lighting that reveals paths
- Fog effects for mystery
- Camera follows character through cave
- Probability-based verification with visual feedback

**Task 2.3: Level 3 - Sudoku Scrambler (3D)**

- Create `frontend/components/zk-quest/levels/SudokuScrambler.tsx` using React Three Fiber
- Build 3D interactive Sudoku board with floating number tiles
- Tiles flip/reveal with animations
- 3D commitment box that "locks" the solution
- Visual hash representation (3D particles/data flow)
- Camera can orbit around the board
- Submit commitment hash to Hedera HCS topic

**Task 2.4: Hedera Proof Submitter Service**

- Create `backend/src/modules/zk/services/hedera-proof-submitter.ts` for HCS integration

### Phase 3: ZK Circuit Infrastructure (Day 2 - Morning)

**Task 3.1: Circom Compiler Service**

- Implement `backend/src/modules/zk/services/circom-compiler.ts`
- Accept circuit code, compile, generate artifacts

**Task 3.2: Proof Generation Service**

- Implement `backend/src/modules/zk/services/proof-generator.ts`
- Use snarkjs to generate proofs

**Task 3.3: Proof Verification Service**

- Implement `backend/src/modules/zk/services/proof-verifier.ts`

**Task 3.4: ZK API Endpoints**

- Create `backend/src/modules/zk/controller.ts` with all endpoints
- Create `backend/src/modules/zk/route.ts`

### Phase 4: World 2 - Circuit Building with 3D Visualization (Day 2 - Afternoon)

**Task 4.1: Monaco Circom Language Support**

- Create `frontend/lib/monaco-circom.ts` for Circom language definition

**Task 4.2: Circuit Editor with 3D Visualization**

- Create `frontend/components/zk-quest/CircuitEditor.tsx`
- Monaco editor with Circom language
- **3D Proof Visualization**: React Three Fiber component showing:
- 3D circuit graph with nodes (gates) and edges (wires)
- Animated data flow through the circuit
- Visual representation of constraints being satisfied
- Proof generation animation (particles flowing)
- Interactive: zoom, rotate, click nodes for details

**Task 4.3: Level 4 - Number Range Prover (3D)**

- Create `frontend/components/zk-quest/levels/RangeProver.tsx` with split view
- Left: Monaco editor with template circuit
- Right: 3D circuit visualization showing circuit as it's being built
- Animated data flow when testing
- Visual feedback for correct/incorrect constraints

**Task 4.4: Level 5 - Age Verifier**

- Create `frontend/components/zk-quest/levels/AgeVerifier.tsx`
- Similar 3D visualization approach

**Task 4.5: Level 6 - Hash Matcher**

- Create `frontend/components/zk-quest/levels/HashMatcher.tsx`
- 3D hash visualization with proof submission

### Phase 6: Hedera Integration & Achievements (Day 3 - Afternoon)

**Task 6.1: Achievement NFT System**

- Extend hedera-proof-submitter.ts to mint NFTs for level completion
- Create NFT metadata schema

**Task 6.2: Proof Submission to HCS**

- Implement HCS topic creation and message submission

**Task 6.3: 3D Leaderboard System**

- Create `backend/src/modules/zk/services/leaderboard.ts`
- Create `frontend/components/zk-quest/Leaderboard.tsx` with 3D visualization:
- 3D podium with top 3 players as 3D avatars
- Scrollable 3D list of all players
- Animated score bars in 3D
- 3D achievement badges floating around players
- Interactive: click player to see their 3D achievement gallery

**Task 6.4: AI ZK Tutor Integration**

- Extend SimpleChat service with ZK-specific context

### Phase 7: Polish & Demo Prep (Day 3 - Evening)

**Task 7.1: 3D UI/UX Polish**

- Add 3D loading animations for proof generation
- Implement smooth 3D transitions between levels (camera fly-throughs)
- Add 3D celebration animations (particles, confetti, 3D badges)
- Add 3D tooltips (floating 3D info panels)
- Add 3D world map for level selection
- Implement 3D achievement gallery (trophy room with 3D NFT displays)
- Add ambient 3D background to main game shell

**Task 7.2: Demo Flow Optimization**

- Create demo mode with auto-advance
- Add "Skip to Level X" for judges
- Optimize 3D scenes for performance

**Task 7.3: Documentation & Testing**

- Test all levels end-to-end
- Verify Hedera integrations

## Key Files to Create/Modify

### New Files

- `frontend/app/zk-quest/page.tsx`
- `frontend/lib/game-state.ts`
- `frontend/hooks/use-game-state.ts`
- `frontend/components/zk-quest/GameShell.tsx` (with 3D background)
- `frontend/components/zk-quest/WorldMap.tsx` (3D interactive map)
- `frontend/components/zk-quest/CircuitEditor.tsx` (with 3D visualization)
- `frontend/components/zk-quest/Leaderboard.tsx` (3D leaderboard)
- `frontend/components/zk-quest/levels/*.tsx` (9 level components, all with 3D)
- `frontend/components/zk-quest/3d/Scene.tsx` - Base 3D scene wrapper
- `frontend/components/zk-quest/3d/Camera.tsx` - Camera controls
- `frontend/components/zk-quest/3d/Effects.tsx` - Post-processing effects
- `frontend/components/zk-quest/3d/Particles.tsx` - Particle systems
- `frontend/lib/monaco-circom.ts`
- `backend/src/modules/zk/controller.ts`
- `backend/src/modules/zk/route.ts`
- `backend/src/modules/zk/services/*.ts` (all services)

### Modified Files

- `backend/src/app.controller.ts` - Add zk routes
- `backend/src/modules/agent/services/simpleChat.ts` - Add ZK context
- `backend/package.json` - Add circom, snarkjs dependencies
- `frontend/package.json` - Add React Three Fiber dependencies
- `frontend/lib/api.ts` - Add ZK API client methods
- `frontend/app/page.tsx` - Add navigation to ZK Quest

## Dependencies to Add

### Backend

- `circom` - Circuit compiler
- `circomlib` - Circuit libraries
- `snarkjs` - Proof generation/verification

### Frontend

- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers (controls, effects, etc.)
- `three` - 3D graphics library
- `@react-spring/three` - Physics-based animations for 3D
- `leva` (optional) - 3D scene debugging controls

## Risk Mitigation

1. **3D Performance**: Optimize scenes, use LOD, limit particle counts
2. **Circom compilation time**: Use smaller circuits for demo, cache compiled artifacts
3. **Hedera testnet reliability**: Add retry logic, fallback to mock mode
4. **Time constraints**: Prioritize World 1 + Level 4 of World 2 for MVP

## Success Criteria

- Users can complete at least 3 levels with full 3D interactivity
- 3D visualizations are smooth and engaging
- Proofs are generated and verified correctly
- Achievements are minted as NFTs on Hedera
- 3D leaderboard shows real on-chain data
- Demo can be completed in <10 minutes with impressive 3D visuals

### To-dos

- [ ] Create game state management system with TypeScript interfaces, localStorage persistence, and React hook (frontend/lib/game-state.ts, frontend/hooks/use-game-state.ts)
- [ ] Create ZK backend module structure with routes and controller (backend/src/modules/zk/controller.ts, route.ts), integrate into app.controller.ts
- [ ] Implement Circom compiler service that compiles circuits and generates artifacts (backend/src/modules/zk/services/circom-compiler.ts)
- [ ] Implement proof generation service using snarkjs (backend/src/modules/zk/services/proof-generator.ts)
- [ ] Implement proof verification service (backend/src/modules/zk/services/proof-verifier.ts)
- [ ] Create game UI shell with navigation, XP bar, and achievement display (frontend/components/zk-quest/GameShell.tsx, WorldMap.tsx)
- [ ] Build Level 1 - Color Game interactive component with ball swapping mechanic and Hedera NFT minting on completion
- [ ] Build Level 2 - Cave Challenge with animated visualization and probability-based verification
- [ ] Build Level 3 - Sudoku Scrambler with commitment scheme and HCS proof submission
- [ ] Create Hedera proof submission service for HCS integration (backend/src/modules/zk/services/hedera-proof-submitter.ts)
- [ ] Add Circom language support to Monaco editor with syntax highlighting (frontend/lib/monaco-circom.ts)
- [ ] Create CircuitEditor component with Monaco, compile button, witness inputs, and proof visualization
- [ ] Build Level 4 - Range Prover with guided circuit building and AI hints integration
- [ ] Build Level 5 - Age Verifier teaching public vs private inputs
- [ ] Build Level 6 - Hash Matcher with circomlib integration and Hedera smart contract submission
- [ ] Build Level 7 - Private Token Transfer with HTS integration and ZK proof submission
- [ ] Build Level 8 - Anonymous Voting system with encrypted votes and public tally
- [ ] Build Level 9 - zkRollup Simulator with batch proof generation and state root submission
- [ ] Implement achievement NFT minting system using HTS tools for level completions
- [ ] Create leaderboard system that queries HCS for proof submissions and ranks users (backend service + frontend component)
- [ ] Extend SimpleChat service with ZK-specific context and circuit debugging capabilities
- [ ] Add loading states, animations, demo mode, and optimize for judge presentation