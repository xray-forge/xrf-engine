import { TCount, TIndex, TLabel } from "xray16/lib";

/**
 * Pages of a list shown a page at a time.
 */
export class DebugPager {
  public page: TIndex = 1;
  public size: TCount;

  public constructor(size: TCount) {
    this.size = size;
  }

  /**
   * @param total - Items in the list.
   * @returns How many pages the items take, at least one.
   */
  public getPageCount(total: TCount): TCount {
    return math.max(1, math.ceil(total / this.size));
  }

  /**
   * @param total - Items in the list.
   * @returns Which page shows out of how many, for the page label.
   */
  public describe(total: TCount): TLabel {
    return string.format("page %d / %d", this.page, this.getPageCount(total));
  }

  /**
   * @param position - Position on the page, from one.
   * @returns Position in the list, from one.
   */
  public getListIndex(position: TIndex): TIndex {
    return (this.page - 1) * this.size + position;
  }

  /**
   * Turn pages, staying within the list.
   *
   * @param step - Pages to turn, back when negative.
   * @param total - Items in the list.
   */
  public turn(step: number, total: TCount): void {
    this.page = math.max(1, math.min(this.getPageCount(total), this.page + step));
  }
}
