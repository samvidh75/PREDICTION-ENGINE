export type SurfaceConfig = {
  radiusPx: number;
  backgroundColor: string;
  backdropBlurPx: number;
  borderColor: string;
};

export class SurfaceCoordinator {
  /**
   * Card styling metrics matching Section 155.
   */
  static getCardConfig(isMobile: boolean): SurfaceConfig {
    return {
      radiusPx: isMobile ? 24 : 28,
      backgroundColor: "rgba(255, 255, 255, 0.035)",
      backdropBlurPx: 24,
      borderColor: "rgba(255, 255, 255, 0.08)"
    };
  }
}
