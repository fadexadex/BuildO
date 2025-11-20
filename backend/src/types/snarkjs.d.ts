/**
 * Type declarations for snarkjs
 * These are minimal declarations for the functionality we use
 */

declare module 'snarkjs' {
  export namespace groth16 {
    function fullProve(
      input: any,
      wasmFile: string | Uint8Array,
      zkeyFileName: string
    ): Promise<{ proof: any; publicSignals: string[] }>;

    function prove(
      zkeyFileName: string,
      witnessFileName: string | Uint8Array
    ): Promise<{ proof: any; publicSignals: string[] }>;

    function verify(
      vKey: any,
      publicSignals: string[],
      proof: any
    ): Promise<boolean>;
  }

  export namespace plonk {
    function fullProve(
      input: any,
      wasmFile: string | Uint8Array,
      zkeyFileName: string
    ): Promise<{ proof: any; publicSignals: string[] }>;

    function prove(
      zkeyFileName: string,
      witnessFileName: string | Uint8Array
    ): Promise<{ proof: any; publicSignals: string[] }>;

    function verify(
      vKey: any,
      publicSignals: string[],
      proof: any
    ): Promise<boolean>;
  }

  export namespace wtns {
    function calculate(
      input: any,
      wasmBuffer: Uint8Array,
      wtnsFile?: string
    ): Promise<{ wtns: Uint8Array }>;

    function check(r1csFile: string, wtnsFile: string): Promise<void>;
  }

  export namespace zKey {
    function newZKey(
      r1csName: string,
      ptauName: string,
      zkeyName: string
    ): Promise<void>;

    function contribute(
      zkeyNameOld: string,
      zkeyNameNew: string,
      name: string,
      entropy: string
    ): Promise<void>;

    function beacon(
      zkeyNameOld: string,
      zkeyNameNew: string,
      name: string,
      beaconHash: string,
      numIterationsExp: number
    ): Promise<void>;

    function verifyFromR1cs(
      r1csFileName: string,
      ptauFileName: string,
      zkeyFileName: string
    ): Promise<boolean>;

    function verifyFromInit(
      initFileName: string,
      ptauFileName: string,
      zkeyFileName: string
    ): Promise<boolean>;

    function exportVerificationKey(zkeyName: string): Promise<any>;

    function exportSolidityVerifier(zkeyName: string): Promise<string>;
  }

  export namespace r1cs {
    function info(r1csName: string): Promise<any>;
  }
}
