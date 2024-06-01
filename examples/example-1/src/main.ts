import { application } from "tulip.js";
import { app } from "./app";

application({
  backgroundColor: 0xFF00FF,
  antialias: true,
  sharedTicker: true,
}).then(async ({ addChild }) => {
  addChild(await app());
});
