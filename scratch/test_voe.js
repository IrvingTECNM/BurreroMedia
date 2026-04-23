
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function shift(str, n) {
    return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) + n)).join('');
}

function reverse(str) {
    return str.split('').reverse().join('');
}

const target = "DROH"; // Start of the Voe string

console.log("ROT13:", rot13(target));
console.log("ROT13 + Shift -3:", shift(rot13(target), -3));
console.log("ROT13 + Shift -3 + Reverse:", reverse(shift(rot13(target), -3)));

const b64_http = "aHR0";
console.log("Required from DROH to get aHR0:");
// D(68) -> a(97) : +29
// R(82) -> H(72) : -10
// O(79) -> R(82) : +3
// H(72) -> 0(48) : -24

// What if the string is reversed?
// H(72) -> a(97) : +25
// O(79) -> H(72) : -7
// R(82) -> R(82) : 0
// D(68) -> 0(48) : -20

// Let's try ROT13 on DROH -> QEBU
// Q(81) -> a(97) : +16
// E(69) -> H(72) : +3
// B(66) -> R(82) : +16
// U(85) -> 0(48) : -37

// Wait, what if the string is "h t t p"?
// aHR0
// If I shift each character by its index?

// wait!
// D(68)  R(82)  O(79)  H(72)
// a(97)  H(72)  R(82)  0(48)
// 68-97=-29
// 82-72=10
// 79-82=-3
// 72-48=24

// This looks like a sequence: -29, 10, -3, 24... no.

// Let's look at the subagent's hint again: "character code shifting (-3)"
// Shift -3:
// D -> A
// R -> O
// O -> L
// H -> E
// AOLE ... hmm.

// Wait! what if it's "atob" but the alphabet is shifted?
// I'll search for the Voe code directly in the filesystem if I can.
// But I can't.
