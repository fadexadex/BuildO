pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template AgeCheck() {
    signal input birthYear;      // Private: actual birth year
    signal input currentYear;    // Public: 2024
    signal output isOver18;      // Public: 1 or 0
    
    signal age;
    age <== currentYear - birthYear;
    
    component gte = GreaterEqThan(8);
    gte.in[0] <== age;
    gte.in[1] <== 18;
    
    isOver18 <== gte.out;
}

component main {public [currentYear]} = AgeCheck();