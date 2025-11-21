import { Router } from "express";
import { ZkController } from "./controller.js";

const router = Router();
const zkController = new ZkController();

// ==================== Circuit Compilation Routes ====================
router.post("/compile", (req, res) => zkController.compileCircuit(req, res));
router.post("/validate-circuit", (req, res) => zkController.validateCircuitSyntax(req, res));
router.get("/artifacts/:circuitName", (req, res) => zkController.getArtifacts(req, res));

// ==================== Proof Generation Routes ====================
router.post("/generate-proof", (req, res) => zkController.generateProof(req, res));
router.post("/calculate-witness", (req, res) => zkController.calculateWitness(req, res));
router.post("/setup-circuit", (req, res) => zkController.setupCircuit(req, res));
router.get("/verification-key/:circuitName", (req, res) => zkController.getVerificationKey(req, res));

// ==================== Proof Verification Routes ====================
router.post("/verify-proof", (req, res) => zkController.verifyProof(req, res));
router.post("/validate-proof-structure", (req, res) => zkController.validateProofStructure(req, res));

// ==================== Hedera Integration Routes ====================
router.post("/verify-hedera", (req, res) => zkController.verifyOnHedera(req, res));
router.post("/submit-to-hedera", (req, res) => zkController.submitProofToHedera(req, res));
router.post("/mint-achievement", (req, res) => zkController.mintAchievementNFT(req, res));
router.post("/complete-level", (req, res) => zkController.completeLevel(req, res));

// ==================== Leaderboard Routes ====================
router.get("/leaderboard", (req, res) => zkController.getLeaderboard(req, res));
router.get("/player/:playerId/rank", (req, res) => zkController.getPlayerRank(req, res));

// ==================== Utility Routes ====================
router.get("/health", (req, res) => zkController.healthCheck(req, res));
router.delete("/cleanup/:circuitName", (req, res) => zkController.cleanupCircuit(req, res));

export default router;
