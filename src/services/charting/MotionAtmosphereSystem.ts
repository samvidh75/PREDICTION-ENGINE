/**
 * Motion & Atmosphere System
 * Charts Feel Alive and Computationally Elegant
 * 
 * Charts should feel alive through:
 * - Adaptive pulse breathing
 * - Environmental telemetry drift
 * - Cinematic rendering transitions
 * - Neural liquidity propagation
 */

class MotionAtmosphereSystem {
  private pulseBreathingEnabled: boolean = true;
  private pulseIntensity: number = 0.3;
  private telemetryDriftEnabled: boolean = true;
  private driftSpeed: number = 0.5;
  private cinematicTransitionsEnabled: boolean = true;
  private neuralPropagationEnabled: boolean = true;
  private holographicIntensity: number = 0.5;

  /**
   * Set pulse breathing
   */
  setPulseBreathing(enabled: boolean, intensity: number): void {
    this.pulseBreathingEnabled = enabled;
    this.pulseIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Get pulse breathing state
   */
  getPulseBreathing(): { enabled: boolean; intensity: number } {
    return {
      enabled: this.pulseBreathingEnabled,
      intensity: this.pulseIntensity
    };
  }

  /**
   * Set telemetry drift
   */
  setTelemetryDrift(enabled: boolean, speed: number): void {
    this.telemetryDriftEnabled = enabled;
    this.driftSpeed = Math.max(0.1, Math.min(2, speed));
  }

  /**
   * Get telemetry drift state
   */
  getTelemetryDrift(): { enabled: boolean; speed: number } {
    return {
      enabled: this.telemetryDriftEnabled,
      speed: this.driftSpeed
    };
  }

  /**
   * Set cinematic transitions
   */
  setCinematicTransitions(enabled: boolean): void {
    this.cinematicTransitionsEnabled = enabled;
  }

  /**
   * Get cinematic transitions state
   */
  getCinematicTransitions(): boolean {
    return this.cinematicTransitionsEnabled;
  }

  /**
   * Set neural propagation
   */
  setNeuralPropagation(enabled: boolean): void {
    this.neuralPropagationEnabled = enabled;
  }

  /**
   * Get neural propagation state
   */
  getNeuralPropagation(): boolean {
    return this.neuralPropagationEnabled;
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Get holographic intensity
   */
  getHolographicIntensity(): number {
    return this.holographicIntensity;
  }

  /**
   * Calculate adaptive pulse breathing
   */
  calculateAdaptivePulseBreathing(timestamp: number): {
    pulseValue: number;
    pulseSpeed: number;
    pulseIntensity: number;
  } {
    if (!this.pulseBreathingEnabled) {
      return { pulseValue: 0, pulseSpeed: 0, pulseIntensity: 0 };
    }

    const baseIntensity = this.pulseIntensity * this.holographicIntensity;
    const pulseSpeed = 0.5 + this.holographicIntensity * 0.5;
    const pulseValue = Math.sin(timestamp / 1000 * pulseSpeed) * baseIntensity;

    return {
      pulseValue,
      pulseSpeed,
      pulseIntensity: baseIntensity
    };
  }

  /**
   * Calculate environmental telemetry drift
   */
  calculateEnvironmentalTelemetryDrift(timestamp: number): {
    driftX: number;
    driftY: number;
    driftIntensity: number;
  } {
    if (!this.telemetryDriftEnabled) {
      return { driftX: 0, driftY: 0, driftIntensity: 0 };
    }

    const driftIntensity = this.driftSpeed * this.holographicIntensity;
    const driftX = Math.sin(timestamp / 2000 * this.driftSpeed) * 2 * driftIntensity;
    const driftY = Math.cos(timestamp / 2000 * this.driftSpeed) * 2 * driftIntensity;

    return {
      driftX,
      driftY,
      driftIntensity
    };
  }

  /**
   * Calculate cinematic rendering transition
   */
  calculateCinematicRenderingTransition(progress: number): {
    opacity: number;
    scale: number;
    blur: number;
    rotation: number;
  } {
    if (!this.cinematicTransitionsEnabled) {
      return { opacity: 1, scale: 1, blur: 0, rotation: 0 };
    }

    const intensity = this.holographicIntensity;
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    return {
      opacity: eased,
      scale: 0.95 + eased * 0.05,
      blur: (1 - eased) * 5 * intensity,
      rotation: (1 - eased) * 2 * intensity
    };
  }

  /**
   * Calculate neural liquidity propagation
   */
  calculateNeuralLiquidityPropagation(timestamp: number, sourceX: number, sourceY: number): Array<{
    x: number;
    y: number;
    intensity: number;
    radius: number;
  }> {
    if (!this.neuralPropagationEnabled) {
      return [];
    }

    const propagation: Array<{
      x: number;
      y: number;
      intensity: number;
      radius: number;
    }> = [];

    const propagationCount = 5 + Math.floor(this.holographicIntensity * 10);
    const propagationSpeed = 1 + this.holographicIntensity * 2;

    for (let i = 0; i < propagationCount; i++) {
      const angle = (i / propagationCount) * Math.PI * 2;
      const distance = (timestamp / 1000 * propagationSpeed) % 100;
      const intensity = Math.max(0, 1 - distance / 100) * this.holographicIntensity;

      propagation.push({
        x: sourceX + Math.cos(angle) * distance,
        y: sourceY + Math.sin(angle) * distance,
        intensity,
        radius: 5 + intensity * 10
      });
    }

    return propagation;
  }

  /**
   * Calculate atmospheric particle system
   */
  calculateAtmosphericParticleSystem(timestamp: number): Array<{
    x: number;
    y: number;
    size: number;
    opacity: number;
    speed: number;
  }> {
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      opacity: number;
      speed: number;
    }> = [];

    const particleCount = 20 + Math.floor(this.holographicIntensity * 30);

    for (let i = 0; i < particleCount; i++) {
      const seed = i * 1000;
      const x = Math.sin((timestamp + seed) / 5000) * 100;
      const y = Math.cos((timestamp + seed) / 4000) * 50;
      const size = 1 + Math.sin((timestamp + seed) / 2000) * 2 * this.holographicIntensity;
      const opacity = 0.2 + Math.sin((timestamp + seed) / 3000) * 0.2 * this.holographicIntensity;
      const speed = 0.5 + this.holographicIntensity;

      particles.push({ x, y, size, opacity, speed });
    }

    return particles;
  }

  /**
   * Calculate volumetric depth effect
   */
  calculateVolumetricDepthEffect(depth: number): {
    blur: number;
    opacity: number;
    scale: number;
    parallax: number;
  } {
    const depthMultiplier = 1 - (depth * 0.5);
    const intensity = this.holographicIntensity;

    return {
      blur: depth * 5 * intensity,
      opacity: depthMultiplier,
      scale: 1 - depth * 0.1,
      parallax: depth * 0.5
    };
  }

  /**
   * Calculate ambient lighting
   */
  calculateAmbientLighting(timestamp: number): {
    ambientIntensity: number;
    ambientColor: string;
    ambientDirection: number;
  } {
    const intensity = this.holographicIntensity;
    const ambientIntensity = 0.3 + Math.sin(timestamp / 5000) * 0.1 * intensity;
    const ambientDirection = timestamp / 10000 % (Math.PI * 2);

    // Calculate ambient color based on direction
    const hue = (ambientDirection / (Math.PI * 2)) * 60 + 180; // Blue to cyan range
    const ambientColor = `hsl(${hue}, 70%, 50%)`;

    return {
      ambientIntensity,
      ambientColor,
      ambientDirection
    };
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.pulseBreathingEnabled = true;
    this.pulseIntensity = 0.3;
    this.telemetryDriftEnabled = true;
    this.driftSpeed = 0.5;
    this.cinematicTransitionsEnabled = true;
    this.neuralPropagationEnabled = true;
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const motionAtmosphereSystem = new MotionAtmosphereSystem();
