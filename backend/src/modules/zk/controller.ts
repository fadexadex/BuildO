import { Request, Response } from "express";
import { getCircomCompilerService, formatCircomErrors } from "./services/circom-compiler.js";
import { getProofGeneratorService, ProvingSystem } from "./services/proof-generator.js";
import { getProofVerifierService } from "./services/proof-verifier.js";
import { getHederaService } from "./services/hedera-proof-submitter.js";

/**
 * ZK Controller
 * Handles all ZK Quest related endpoints
 */
export class ZkController {
  private compilerService = getCircomCompilerService();
  private proofGenerator = getProofGeneratorService();
  private proofVerifier = getProofVerifierService();

  // ==================== Circuit Compilation Endpoints ====================

  /**
   * POST /zk/compile
   * Compile a Circom circuit
   */
  async compileCircuit(req: Request, res: Response) {
    try {
      const { circuitCode, circuitName, options } = req.body;

      if (!circuitCode || !circuitName) {
        return res.status(400).json({
          error: "Missing required fields: circuitCode, circuitName",
        });
      }

      console.log(`Compiling circuit: ${circuitName}`);

      const result = await this.compilerService.compileCircuit(
        circuitCode,
        circuitName,
        options
      );

      if (!result.success) {
        // Format errors for display
        const formattedErrors = result.errors && result.errors.length > 0 
          ? formatCircomErrors(result.errors) 
          : 'Compilation failed';
        
        // Log to backend console
        if (result.errors && result.errors.length > 0) {
          console.error('\n========================================');
          console.error('❌ CIRCUIT COMPILATION FAILED');
          console.error('========================================');
          console.error(formattedErrors);
          console.error('========================================\n');
        }
        
        return res.status(400).json({
          error: "Compilation failed",
          errors: result.errors,
          formattedErrors: formattedErrors, // Send formatted version for UI
          warnings: result.warnings,
        });
      }

      res.json({
        success: true,
        message: "Circuit compiled successfully",
        circuitName: result.circuitName,
        artifacts: result.artifacts,
        stats: result.stats,
        warnings: result.warnings,
      });
    } catch (error) {
      console.error("Compilation error:", error);
      res.status(500).json({
        error: "Failed to compile circuit",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /zk/validate-circuit
   * Validate circuit syntax without full compilation
   */
  async validateCircuitSyntax(req: Request, res: Response) {
    try {
      const { circuitCode, circuitName } = req.body;

      if (!circuitCode || !circuitName) {
        return res.status(400).json({
          error: "Missing required fields: circuitCode, circuitName",
        });
      }

      const result = await this.compilerService.validateCircuitSyntax(
        circuitCode,
        circuitName
      );

      // Format errors for display
      const formattedErrors = !result.valid && result.errors && result.errors.length > 0
        ? formatCircomErrors(result.errors)
        : undefined;
      
      // Log validation errors to console for easy debugging
      if (formattedErrors) {
        console.error('\n========================================');
        console.error('❌ CIRCUIT VALIDATION FAILED');
        console.error('========================================');
        console.error(formattedErrors);
        console.error('========================================\n');
      }

      res.json({
        valid: result.valid,
        errors: result.errors,
        formattedErrors: formattedErrors, // Send formatted version for UI
      });
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({
        error: "Failed to validate circuit",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /zk/artifacts/:circuitName
   * Get compiled artifacts for a circuit
   */
  async getArtifacts(req: Request, res: Response) {
    try {
      const { circuitName } = req.params;

      const artifacts = await this.compilerService.getArtifacts(circuitName);

      res.json({
        success: true,
        circuitName,
        artifacts,
      });
    } catch (error) {
      console.error("Error getting artifacts:", error);
      res.status(404).json({
        error: "Artifacts not found",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==================== Proof Generation Endpoints ====================

  /**
   * POST /zk/generate-proof
   * Generate a ZK proof for given inputs
   */
  async generateProof(req: Request, res: Response) {
    try {
      const { circuitName, inputs, provingSystem = "groth16" } = req.body;

      if (!circuitName || !inputs) {
        return res.status(400).json({
          error: "Missing required fields: circuitName, inputs",
        });
      }

      console.log(`Generating proof for circuit: ${circuitName}`);

      // Get compiled artifacts
      const artifacts = await this.compilerService.getArtifacts(circuitName);

      if (!artifacts.wasm || !artifacts.r1cs) {
        return res.status(400).json({
          error: "Circuit not compiled. Please compile the circuit first.",
        });
      }

      // Get or create zkey
      const zkeyPath = await this.proofGenerator.getOrCreateZKey(
        circuitName,
        artifacts.r1cs,
        provingSystem as ProvingSystem
      );

      // Generate proof
      const result = await this.proofGenerator.fullProve(
        circuitName,
        artifacts.wasm,
        zkeyPath,
        inputs,
        provingSystem as ProvingSystem
      );

      if (!result.success) {
        // Format errors for display
        const formattedErrors = result.errors && result.errors.length > 0
          ? result.errors.join('\n')
          : 'Proof generation failed';
        
        // Log formatted errors to console for easy debugging
        if (result.errors && result.errors.length > 0) {
          console.error('\n========================================');
          console.error('❌ PROOF GENERATION FAILED');
          console.error('========================================');
          result.errors.forEach((error: string) => {
            console.error(error);
          });
          console.error('========================================\n');
        }
        
        return res.status(400).json({
          error: "Proof generation failed",
          errors: result.errors,
          formattedErrors: formattedErrors, // Send formatted version for UI
        });
      }

      res.json({
        success: true,
        message: "Proof generated successfully",
        proof: result.proof,
        publicSignals: result.publicSignals,
        generationTime: result.generationTime,
      });
    } catch (error) {
      console.error("Proof generation error:", error);
      res.status(500).json({
        error: "Failed to generate proof",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /zk/calculate-witness
   * Calculate witness for given inputs
   */
  async calculateWitness(req: Request, res: Response) {
    try {
      const { circuitName, inputs } = req.body;

      if (!circuitName || !inputs) {
        return res.status(400).json({
          error: "Missing required fields: circuitName, inputs",
        });
      }

      const artifacts = await this.compilerService.getArtifacts(circuitName);

      if (!artifacts.wasm) {
        return res.status(400).json({
          error: "WASM artifact not found. Please compile the circuit first.",
        });
      }

      const result = await this.proofGenerator.calculateWitness(
        circuitName,
        artifacts.wasm,
        inputs
      );

      if (!result.success) {
        // Format errors for display
        const formattedErrors = result.errors && result.errors.length > 0
          ? result.errors.join('\n')
          : 'Witness calculation failed';
        
        // Log formatted errors to console for easy debugging
        if (result.errors && result.errors.length > 0) {
          console.error('\n========================================');
          console.error('❌ WITNESS CALCULATION FAILED');
          console.error('========================================');
          result.errors.forEach((error: string) => {
            console.error(error);
          });
          console.error('========================================\n');
        }
        
        return res.status(400).json({
          error: "Witness calculation failed",
          errors: result.errors,
          formattedErrors: formattedErrors, // Send formatted version for UI
        });
      }

      res.json({
        success: true,
        message: "Witness calculated successfully",
        witnessPath: result.witnessPath,
      });
    } catch (error) {
      console.error("Witness calculation error:", error);
      res.status(500).json({
        error: "Failed to calculate witness",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /zk/setup-circuit
   * Run trusted setup for a circuit
   */
  async setupCircuit(req: Request, res: Response) {
    try {
      const { circuitName, provingSystem = "groth16" } = req.body;

      if (!circuitName) {
        return res.status(400).json({
          error: "Missing required field: circuitName",
        });
      }

      const artifacts = await this.compilerService.getArtifacts(circuitName);

      if (!artifacts.r1cs) {
        return res.status(400).json({
          error: "R1CS file not found. Please compile the circuit first.",
        });
      }

      const result = await this.proofGenerator.setupCircuit(
        circuitName,
        artifacts.r1cs,
        provingSystem as ProvingSystem
      );

      if (!result.success) {
        // Format errors for display
        const formattedErrors = result.errors && result.errors.length > 0
          ? result.errors.join('\n')
          : 'Setup failed';
        
        // Log formatted errors to console for easy debugging
        if (result.errors && result.errors.length > 0) {
          console.error('\n========================================');
          console.error('❌ CIRCUIT SETUP FAILED');
          console.error('========================================');
          result.errors.forEach((error: string) => {
            console.error(error);
          });
          console.error('========================================\n');
        }
        
        return res.status(400).json({
          error: "Setup failed",
          errors: result.errors,
          formattedErrors: formattedErrors, // Send formatted version for UI
        });
      }

      res.json({
        success: true,
        message: "Circuit setup completed successfully",
        zkeyPath: result.zkeyPath,
        verificationKeyPath: result.verificationKeyPath,
      });
    } catch (error) {
      console.error("Setup error:", error);
      res.status(500).json({
        error: "Failed to setup circuit",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /zk/verification-key/:circuitName
   * Get verification key for a circuit
   */
  async getVerificationKey(req: Request, res: Response) {
    try {
      const { circuitName } = req.params;

      const paths = this.proofGenerator.getCircuitPaths(circuitName);
      
      if (!paths.zkey) {
        return res.status(404).json({
          error: "Zkey not found. Please setup the circuit first.",
        });
      }

      const vKey = await this.proofGenerator.exportVerificationKey(paths.zkey);

      res.json({
        success: true,
        circuitName,
        verificationKey: vKey,
      });
    } catch (error) {
      console.error("Error getting verification key:", error);
      res.status(500).json({
        error: "Failed to get verification key",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==================== Proof Verification Endpoints ====================

  /**
   * POST /zk/verify-proof
   * Verify a ZK proof
   */
  async verifyProof(req: Request, res: Response) {
    try {
      const {
        proof,
        publicSignals,
        verificationKey,
        circuitName,
        provingSystem = "groth16",
      } = req.body;

      if (!proof || !publicSignals) {
        return res.status(400).json({
          error: "Missing required fields: proof, publicSignals",
        });
      }

      console.log(`Verifying proof for circuit: ${circuitName || "unknown"}`);

      let result;

      if (circuitName && !verificationKey) {
        // Use stored verification key
        result = await this.proofVerifier.verifyProofWithStoredKey(
          circuitName,
          publicSignals,
          proof,
          provingSystem as ProvingSystem
        );
      } else if (verificationKey) {
        // Use provided verification key
        result = await this.proofVerifier.verifyProof(
          verificationKey,
          publicSignals,
          proof,
          provingSystem as ProvingSystem
        );
      } else {
        return res.status(400).json({
          error: "Either circuitName or verificationKey must be provided",
        });
      }

      if (!result.success) {
        // Format errors for display
        const formattedErrors = result.errors && result.errors.length > 0
          ? result.errors.join('\n')
          : 'Verification failed';
        
        // Log formatted errors to console for easy debugging
        if (result.errors && result.errors.length > 0) {
          console.error('\n========================================');
          console.error('❌ PROOF VERIFICATION FAILED');
          console.error('========================================');
          result.errors.forEach((error: string) => {
            console.error(error);
          });
          console.error('========================================\n');
        }
        
        return res.status(400).json({
          error: "Verification failed",
          errors: result.errors,
          formattedErrors: formattedErrors, // Send formatted version for UI
        });
      }

      res.json({
        success: true,
        verified: result.verified,
        verificationTime: result.verificationTime,
        details: result.details,
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({
        error: "Failed to verify proof",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /zk/validate-proof-structure
   * Validate proof structure without full verification
   */
  async validateProofStructure(req: Request, res: Response) {
    try {
      const { proof, provingSystem = "groth16" } = req.body;

      if (!proof) {
        return res.status(400).json({
          error: "Missing required field: proof",
        });
      }

      const result = this.proofVerifier.validateProofStructure(
        proof,
        provingSystem as ProvingSystem
      );

      res.json({
        valid: result.valid,
        errors: result.errors,
      });
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({
        error: "Failed to validate proof structure",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==================== Hedera Integration Endpoints ====================

  /**
   * POST /zk/submit-to-hedera
   * Submit proof to Hedera Consensus Service
   */
  async submitProofToHedera(req: Request, res: Response) {
    try {
      const { proof, levelId, playerId, metadata } = req.body;

      if (!proof || !levelId || !playerId) {
        return res.status(400).json({
          error: "Missing required fields: proof, levelId, playerId",
        });
      }

      const hederaService = getHederaService();

      // Create proof hash
      const proofHash = Buffer.from(JSON.stringify(proof)).toString("base64");

      // Submit to HCS
      const transactionId = await hederaService.submitProof({
        level: levelId,
        proofHash,
        userId: playerId,
        timestamp: Date.now(),
        metadata,
      });

      res.json({
        success: true,
        message: "Proof submitted to Hedera successfully",
        transactionId,
        proofHash,
      });
    } catch (error) {
      console.error("Hedera submission error:", error);
      res.status(500).json({
        error: "Failed to submit proof to Hedera",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /zk/mint-achievement
   * Mint achievement NFT on Hedera
   */
  async mintAchievementNFT(req: Request, res: Response) {
    try {
      const { playerId, levelId, proof, recipientAccountId } = req.body;

      if (!playerId || !levelId || !proof) {
        return res.status(400).json({
          error: "Missing required fields: playerId, levelId, proof",
        });
      }

      const hederaService = getHederaService();

      // Create proof hash
      const proofHash = Buffer.from(JSON.stringify(proof)).toString("base64");

      // Complete level (submit proof + mint NFT)
      const result = await hederaService.completeLevel(
        levelId,
        proofHash,
        playerId,
        recipientAccountId
      );

      res.json({
        success: true,
        message: "Achievement NFT minted successfully",
        transactionId: result.transactionId,
        nftSerial: result.nftSerial,
      });
    } catch (error) {
      console.error("NFT minting error:", error);
      res.status(500).json({
        error: "Failed to mint achievement NFT",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /zk/complete-level
   * Complete a level (compile, prove, verify, submit to Hedera)
   */
  async completeLevel(req: Request, res: Response) {
    try {
      const {
        levelId,
        playerId,
        circuitCode,
        circuitName,
        inputs,
        recipientAccountId,
        provingSystem = "groth16",
      } = req.body;

      if (!levelId || !playerId || !circuitCode || !circuitName || !inputs) {
        return res.status(400).json({
          error:
            "Missing required fields: levelId, playerId, circuitCode, circuitName, inputs",
        });
      }

      console.log(`Completing level ${levelId} for player ${playerId}`);

      // Step 1: Compile circuit
      const compilationResult = await this.compilerService.compileCircuit(
        circuitCode,
        circuitName,
        { includeWasm: true, includeR1cs: true }
      );

      if (!compilationResult.success) {
        // Format errors for display
        const formattedErrors = compilationResult.errors && compilationResult.errors.length > 0
          ? formatCircomErrors(compilationResult.errors)
          : 'Compilation failed';
        
        // Log formatted errors to console for easy debugging
        if (compilationResult.errors && compilationResult.errors.length > 0) {
          console.error('\n========================================');
          console.error('❌ CIRCUIT COMPILATION FAILED (Level Complete)');
          console.error('========================================');
          console.error(formattedErrors);
          console.error('========================================\n');
        }
        
        return res.status(400).json({
          error: "Circuit compilation failed",
          errors: compilationResult.errors,
          formattedErrors: formattedErrors, // Send formatted version for UI
        });
      }

      // Step 2: Setup circuit
      const artifacts = compilationResult.artifacts;
      const zkeyPath = await this.proofGenerator.getOrCreateZKey(
        circuitName,
        artifacts.r1cs!,
        provingSystem as ProvingSystem
      );

      // Step 3: Generate proof
      const proofResult = await this.proofGenerator.fullProve(
        circuitName,
        artifacts.wasm!,
        zkeyPath,
        inputs,
        provingSystem as ProvingSystem
      );

      if (!proofResult.success) {
        return res.status(400).json({
          error: "Proof generation failed",
          errors: proofResult.errors,
        });
      }

      // Step 4: Verify proof
      const vKey = await this.proofGenerator.exportVerificationKey(zkeyPath);
      const verificationResult = await this.proofVerifier.verifyProof(
        vKey,
        proofResult.publicSignals!,
        proofResult.proof,
        provingSystem as ProvingSystem
      );

      if (!verificationResult.verified) {
        return res.status(400).json({
          error: "Proof verification failed",
          details: "The generated proof is invalid",
        });
      }

      // Step 5: Submit to Hedera
      const hederaService = getHederaService();
      const proofHash = Buffer.from(JSON.stringify(proofResult.proof)).toString(
        "base64"
      );

      const hederaResult = await hederaService.completeLevel(
        levelId,
        proofHash,
        playerId,
        recipientAccountId
      );

      res.json({
        success: true,
        message: "Level completed successfully",
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
        verified: true,
        transactionId: hederaResult.transactionId,
        nftSerial: hederaResult.nftSerial,
        stats: {
          compilationStats: compilationResult.stats,
          generationTime: proofResult.generationTime,
          verificationTime: verificationResult.verificationTime,
        },
      });
    } catch (error) {
      console.error("Level completion error:", error);
      res.status(500).json({
        error: "Failed to complete level",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==================== Leaderboard Endpoints ====================

  /**
   * GET /zk/leaderboard
   * Get leaderboard data
   */
  async getLeaderboard(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 100;

      const hederaService = getHederaService();
      const submissions = await hederaService.getProofSubmissions(limit);

      // Aggregate by player
      const playerStats = new Map<
        string,
        { xp: number; levels: Set<string>; lastActivity: number }
      >();

      submissions.forEach((submission) => {
        const stats = playerStats.get(submission.userId) || {
          xp: 0,
          levels: new Set<string>(),
          lastActivity: 0,
        };

        stats.levels.add(submission.level);
        stats.xp += 100; // 100 XP per level
        stats.lastActivity = Math.max(stats.lastActivity, submission.timestamp);

        playerStats.set(submission.userId, stats);
      });

      // Convert to leaderboard array
      const leaderboard = Array.from(playerStats.entries())
        .map(([playerId, stats]) => ({
          playerId,
          xp: stats.xp,
          levelsCompleted: stats.levels.size,
          lastActivity: stats.lastActivity,
        }))
        .sort((a, b) => b.xp - a.xp);

      res.json({
        success: true,
        leaderboard,
        total: leaderboard.length,
      });
    } catch (error) {
      console.error("Leaderboard error:", error);
      res.status(500).json({
        error: "Failed to get leaderboard",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /zk/player/:playerId/rank
   * Get player rank and stats
   */
  async getPlayerRank(req: Request, res: Response) {
    try {
      const { playerId } = req.params;

      if (!playerId) {
        return res.status(400).json({
          error: "Missing playerId parameter",
        });
      }

      const hederaService = getHederaService();
      const submissions = await hederaService.getProofSubmissions(1000);

      // Aggregate by player
      const playerStats = new Map<
        string,
        { xp: number; levels: Set<string>; lastActivity: number }
      >();

      submissions.forEach((submission) => {
        const stats = playerStats.get(submission.userId) || {
          xp: 0,
          levels: new Set<string>(),
          lastActivity: 0,
        };

        stats.levels.add(submission.level);
        stats.xp += 100; // 100 XP per level
        stats.lastActivity = Math.max(stats.lastActivity, submission.timestamp);

        playerStats.set(submission.userId, stats);
      });

      // Convert to leaderboard array and sort
      const leaderboard = Array.from(playerStats.entries())
        .map(([id, stats]) => ({
          playerId: id,
          xp: stats.xp,
          levelsCompleted: stats.levels.size,
          lastActivity: stats.lastActivity,
        }))
        .sort((a, b) => b.xp - a.xp);

      // Find player's rank
      const playerIndex = leaderboard.findIndex((entry) => entry.playerId === playerId);
      const playerEntry = playerIndex >= 0 ? leaderboard[playerIndex] : null;

      if (!playerEntry) {
        return res.json({
          success: true,
          playerId,
          rank: null,
          xp: 0,
          levelsCompleted: 0,
          message: "Player not found in leaderboard",
        });
      }

      res.json({
        success: true,
        playerId,
        rank: playerIndex + 1,
        xp: playerEntry.xp,
        levelsCompleted: playerEntry.levelsCompleted,
        lastActivity: playerEntry.lastActivity,
        totalPlayers: leaderboard.length,
      });
    } catch (error) {
      console.error("Player rank error:", error);
      res.status(500).json({
        error: "Failed to get player rank",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==================== Utility Endpoints ====================

  /**
   * GET /zk/health
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response) {
    res.json({
      status: "ok",
      message: "ZK Quest API is running",
      timestamp: Date.now(),
    });
  }

  /**
   * DELETE /zk/cleanup/:circuitName
   * Clean up circuit artifacts
   */
  async cleanupCircuit(req: Request, res: Response) {
    try {
      const { circuitName } = req.params;

      await this.compilerService.cleanCircuit(circuitName);
      await this.proofGenerator.cleanCircuit(circuitName);

      res.json({
        success: true,
        message: `Cleaned up artifacts for circuit: ${circuitName}`,
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({
        error: "Failed to cleanup circuit",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export const zkController = new ZkController();
