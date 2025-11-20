pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

template Multiplier2(N) {
    signal input x[N];
    signal output y[N];

    for (var i = 0; i < N; i++) {
        y[i] <== x[i] * 2;
    }
}

component main = Multiplier2(10);
