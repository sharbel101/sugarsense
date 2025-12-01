import { predictAbsolute } from "./predictor";

const result = predictAbsolute({
  currentBG: 98,
  carbs: 83,
  bolus: 10,
  cir: 4.2
});

console.log("Predicted BG:", result);
