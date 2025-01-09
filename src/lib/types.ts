export interface Header {
  key: string;
  caption: string;
  width?: string;
  visible?: boolean;
}

export interface DataRecord {
  [key: string]: any;
}

export type Position = {
  x: number;
  y: number;
};
