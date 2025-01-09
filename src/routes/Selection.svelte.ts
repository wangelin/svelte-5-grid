export type SelectionCell = {
  col: number;
  row: number;
};

export default class Selection {
  start: SelectionCell | undefined = $state(undefined);
  end: SelectionCell | undefined = $state(undefined);

  constructor(
    start: SelectionCell | undefined,
    end?: SelectionCell | undefined
  ) {
    if (start && end) {
      this.start = start;
      this.end = end;
    } else if (start) {
      this.start = start;
    }
  }

  rect() {
    if (!this.start && !this.end)
      return [
        { row: -1, col: -1 },
        { row: -1, col: -1 },
        { row: -1, col: -1 },
        { row: -1, col: -1 },
      ];
    let start = this.start as SelectionCell;
    let end = this.end as SelectionCell;
    if (!end) end = start;
    if (!start) start = end;
    let c0 = start.col;
    let c1 = end.col;
    let r0 = start.row;
    let r1 = end.row;
    if (c0 > c1) [c0, c1] = [c1, c0];
    if (r0 > r1) [r0, r1] = [r1, r0];
    return [
      { row: r0, col: c0 },
      { row: r0, col: c1 },
      { row: r1, col: c0 },
      { row: r1, col: c1 },
    ];
  }

  toString() {
    if (!this.start && !this.end) {
      return "Selection: None";
    }

    const startStr = this.start
      ? `(${this.start.row}, ${this.start.col})`
      : "undefined";
    const endStr = this.end
      ? `(${this.end.row}, ${this.end.col})`
      : "undefined";

    return `Selection: Start = ${startStr}, End = ${endStr}, rect: ${JSON.stringify(
      this.rect()
    )}`;
  }
}
