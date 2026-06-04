export type HeaderConfig = {
  heightPx: number;
  backgroundColor: string;
  backdropBlurPx: number;
  borderColor: string;
  logoSizePx: number;
  titleFontSizePx: number;
  searchWidthPx: number;
  searchHeightPx: number;
  searchRadiusPx: number;
};

export class HeaderLayoutSystem {
  /**
   * Header dimensions and properties matching Section 131 and 132.
   */
  static getConfiguration(): HeaderConfig {
    return {
      heightPx: 72,
      backgroundColor: "rgba(4, 6, 9, 0.96)",
      backdropBlurPx: 24,
      borderColor: "rgba(255, 255, 255, 0.05)",
      logoSizePx: 28,
      titleFontSizePx: 18,
      searchWidthPx: 560,
      searchHeightPx: 46,
      searchRadiusPx: 18
    };
  }
}
