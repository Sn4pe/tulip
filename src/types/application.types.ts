import * as PIXI from "pixi.js";
import { DisplayObjectMutable } from "./components";
import { WindowMutable } from "./window.types";
import { ScaleMode } from "../enums";

export type ApplicationProps = {
  // Development
  importMetaEnv?: any;
  importMetaHot?: any;

  backgroundColor?: number;
  scale?: number;
  showFPS?: boolean;
  pointerLock?: boolean;
  pixelPerfect?: boolean;
  scaleMode?: ScaleMode;
};

export type ApplicationMutable = {
  load: (load: () => Promise<void> | void) => void;

  add: (displayObjectMutable: DisplayObjectMutable<any>) => void;
  remove: (displayObjectMutable: DisplayObjectMutable<any>) => void;

  start: () => void;
  stop: () => void;

  isPixelPerfect: () => boolean;
  getScale: () => number;
  getScaleMode: () => ScaleMode;

  $getApplication: () => PIXI.Application;

  window: WindowMutable;
};
