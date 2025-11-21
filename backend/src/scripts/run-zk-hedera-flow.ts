import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { Request, Response } from 'express';
import { ZkController } from '../modules/zk/controller.js';

type Handler = (req: Request, res: Response) => Promise<any>;

interface InvokeOptions<TBody> {
  label: string;
  body: TBody;
}

class MockResponse<T> {
  statusCode = 200;
  constructor(
    private readonly label: string,
    private readonly resolve: (value: T) => void,
    private readonly reject: (reason?: any) => void
  ) {}

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(payload: T) {
    if (this.statusCode >= 400) {
      const error = new Error(`${this.label} failed with status ${this.statusCode}`);
      (error as any).payload = payload;
      this.reject(error);
    } else {
      this.resolve(payload);
    }
    return this;
  }
}

async function invokeEndpoint<TReq, TRes>(
  handler: Handler,
  options: InvokeOptions<TReq>
): Promise<TRes> {
  return new Promise((resolve, reject) => {
    const mockReq = { body: options.body } as Request;
    const mockRes = new MockResponse<TRes>(options.label, resolve, reject) as unknown as Response;

    handler(mockReq, mockRes).catch(reject);
  });
}

async function main() {
  const controller = new ZkController();
  const circuitName = process.argv[2] || 'custom';
  const circuitPath = path.join(process.cwd(), 'zk-workspace', 'circuits', `${circuitName}.circom`);
  const accountId = process.env.HEDERA_TEST_ACCOUNT_ID || '0.0.6255888';
  const privateKey =
    process.env.HEDERA_TEST_PRIVATE_KEY ||
    '3030020100300706052b8104000a04220420429807aad2cb548e3ec4d9954a510f60b0794363da6743c736d77a63eb4f0e7c';

  console.log('=== Running ZK → Hedera integration flow ===');
  console.log(`Circuit: ${circuitName}`);
  console.log(`Circuit file: ${circuitPath}`);

  const circuitCode = await fs.readFile(circuitPath, 'utf-8');

  await invokeEndpoint(controller.compileCircuit.bind(controller), {
    label: 'compileCircuit',
    body: {
      circuitCode,
      circuitName,
      options: {
        includeWasm: true,
        includeR1cs: true,
        includeSym: true,
      },
    },
  });

  console.log('✓ Circuit compiled');

  const inputs = {
    a: '1',
    b: '3',
  };

  const proofResponse = await invokeEndpoint(controller.generateProof.bind(controller), {
    label: 'generateProof',
    body: {
      circuitName,
      inputs,
      provingSystem: 'groth16',
    },
  });

  console.log('✓ Proof generated');

  const verificationResponse = await invokeEndpoint(controller.verifyOnHedera.bind(controller), {
    label: 'verifyOnHedera',
    body: {
      circuitName,
      proof: (proofResponse as any).proof,
      publicSignals: (proofResponse as any).publicSignals,
      accountId,
      privateKey,
      provingSystem: 'groth16',
    },
  });

  console.log('✓ Hedera verification completed');
  console.dir(verificationResponse, { depth: null });
}

main().catch((error) => {
  console.error('Integration flow failed:', error);
  if ((error as any).payload) {
    console.error('Response payload:', (error as any).payload);
  }
  process.exitCode = 1;
});


