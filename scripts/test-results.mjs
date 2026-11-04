// The free-form result text must never be misclassified or hidden by the wall layout.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(new URL("../src/lib/result-wall.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { resultGrade, districtRank } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
for (const [input, expected] of [
  ["A", "A"], [" b ", "B"], ["Combined Maths: A · Z-score 1.54 · Kalutara District 147", "A"],
  ["Combined Mathematics: b · Z-score 1.2", "B"], ["A · Z-score 1.5", "A"],
  ["A A B", null], ["A/B", null], ["AAA", null], ["B+", null], ["District Rank 1", null], ["", null],
]) assert.equal(resultGrade(input), expected, input);
console.log("Results wall: unambiguous grades grouped; other formats preserved.");

for (const [input, expected] of [
  ["Kalutara District 02", { label: "Kalutara District 02", number: "02" }],
  ["Colombo District Rank 1", { label: "Colombo District Rank 1", number: "1" }],
  ["Combined Maths: A · Z-score 1.54 · Kalutara District 147", { label: "Kalutara District 147", number: "147" }],
  ["Maths + ICT · ඉහළම Z-score", null], ["Z-score 2.5971", null], ["District 1 and 2", null], ["", null],
]) assert.deepEqual(districtRank(input), expected, input);
console.log("Results wall: explicit district ranks highlighted without misreading other achievements.");
