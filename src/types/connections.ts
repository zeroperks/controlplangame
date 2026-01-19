import { ComponentKey } from "../sim";

export type PortType = "in" | "out";

export interface PortRef {
  key: ComponentKey;
  port: PortType;
}

export interface Connection {
  from: PortRef;
  to: PortRef;
}
