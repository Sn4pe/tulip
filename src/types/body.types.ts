import p2 from "p2";
import { Point } from "./point.types";
import { Shapes } from "../types/shapes";
import { BodyMaterialProps } from "./material.types";

export type BodyProps = {
  mass?: number;
  angle?: number;

  material?: BodyMaterialProps;
};
export type BodyMutable<Raw extends any = {}> = {
  addShape: <Shape extends Shapes>(shapeProps: Shape) => number;
  removeShape: (shapeId: number) => void;

  setPosition: (position: Point) => void;
  getPosition: () => Point;

  getAngle: () => number;
  setAngle: (angle: number) => void;

  addForceX: (force: number) => void;
  addForceY: (force: number) => void;
  addForce: (force: Point) => void;

  $getBody: () => p2.Body;
  $getMaterial: () => p2.Material;
  $getContactBody: (bodyMutable: BodyMutable) => p2.ContactMaterial;
};
