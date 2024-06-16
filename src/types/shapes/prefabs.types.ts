import { ContainerProps } from "../components";

export type CircleProps = {
  props: {
    color: number;
    size: number;
    mass: number;
  };
} & ContainerProps;
