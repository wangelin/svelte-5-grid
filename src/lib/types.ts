import type { Snippet, Component } from "svelte";

export interface Header {
  key: string;
  editable?: boolean;
  caption: string;
  width?: string;
  visible?: boolean;
  type?: "text" | "multiline" | "select" | "number" | "boolean";
  options?: { value: any; caption: string }[];
  snippet?: any;
  component?: Component<any>;
  props?: { [key: string]: any };
}

export interface DataRecord extends Record<string, any> {
  [key: string]: any;
}

export type Position = {
  x: number;
  y: number;
};
