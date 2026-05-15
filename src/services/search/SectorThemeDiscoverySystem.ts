/**
 * Sector & Theme Discovery System
 * Major Exploration Engine
 * 
 * Allows users to discover markets visually:
 * - AI infrastructure
 * - defence expansion
 * - semiconductor ecosystems
 * - green energy
 * - banking leadership
 * - digital India growth
 * - manufacturing evolution
 */

import {
  SectorDiscoveryTheme
} from '../../types/SearchTypes';

class SectorThemeDiscoverySystem {
  private discoveryThemes: SectorDiscoveryTheme[] = [];
  private holographicIntensity: number = 0.5;

  constructor() {
    this.initializeDiscoveryThemes();
  }

  private initializeDiscoveryThemes(): void {
    this.discoveryThemes = [
      {
        id: 'ai_infrastructure',
        title: 'AI Infrastructure',
        description: 'Companies benefiting from artificial intelligence adoption and implementation',
        companies: ['TCS', 'INFY', 'WIPRO', 'HCLTECH'],
        healthometerAverage: 0.75,
        institutionalParticipation: 0.8,
        volatility: 0.4,
        color: '#00aaff'
      },
      {
        id: 'defence_expansion',
        title: 'Defence Expansion',
        description: 'Defence sector growth and modernisation initiatives',
        companies: ['HAL', 'BEL', 'M&M', 'L&T'],
        healthometerAverage: 0.7,
        institutionalParticipation: 0.75,
        volatility: 0.5,
        color: '#ff4466'
      },
      {
        id: 'semiconductor_ecosystem',
        title: 'Semiconductor Ecosystem',
        description: 'Semiconductor manufacturing and design companies',
        companies: ['TATAELXSI', 'SANDHAR', 'MOSCHIP', 'NESTLE'],
        healthometerAverage: 0.65,
        institutionalParticipation: 0.7,
        volatility: 0.6,
        color: '#ffaa00'
      },
      {
        id: 'green_energy',
        title: 'Green Energy Transition',
        description: 'Renewable energy and sustainability focused companies',
        companies: ['TATAMOTORS', 'RELIANCE', 'ADANIGREEN', 'JSWENERGY'],
        healthometerAverage: 0.72,
        institutionalParticipation: 0.78,
        volatility: 0.45,
        color: '#00ff88'
      },
      {
        id: 'banking_leadership',
        title: 'Banking Leadership',
        description: 'Banking sector leadership and growth companies',
        companies: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK'],
        healthometerAverage: 0.68,
        institutionalParticipation: 0.85,
        volatility: 0.35,
        color: '#0088cc'
      },
      {
        id: 'digital_india',
        title: 'Digital India Growth',
        description: 'Digital transformation and technology adoption companies',
        companies: ['INFY', 'TCS', 'HCLTECH', 'WIPRO'],
        healthometerAverage: 0.8,
        institutionalParticipation: 0.82,
        volatility: 0.3,
        color: '#aa88ff'
      },
      {
        id: 'manufacturing_evolution',
        title: 'Manufacturing Evolution',
        description: 'Manufacturing sector modernisation and growth',
        companies: ['L&T', 'TATAMOTORS', 'M&M', 'JSWSTEEL'],
        healthometerAverage: 0.7,
        institutionalParticipation: 0.75,
        volatility: 0.5,
        color: '#ff8844'
      },
      {
        id: 'healthcare_innovation',
        title: 'Healthcare Innovation',
        description: 'Healthcare and pharmaceutical innovation companies',
        companies: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'AUROPHARMA'],
        healthometerAverage: 0.75,
        institutionalParticipation: 0.7,
        volatility: 0.4,
        color: '#ff66cc'
      }
    ];
  }

  /**
   * Get all discovery themes
   */
  getDiscoveryThemes(): SectorDiscoveryTheme[] {
    return [...this.discoveryThemes];
  }

  /**
   * Get discovery theme by ID
   */
  getDiscoveryThemeById(id: string): SectorDiscoveryTheme | undefined {
    return this.discoveryThemes.find(theme => theme.id === id);
  }

  /**
   * Search discovery themes
   */
  searchDiscoveryThemes(query: string): SectorDiscoveryTheme[] {
    const lowerQuery = query.toLowerCase();
    
    return this.discoveryThemes.filter(theme =>
      theme.title.toLowerCase().includes(lowerQuery) ||
      theme.description.toLowerCase().includes(lowerQuery) ||
      theme.companies.some(company => company.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Calculate holographic sector constellations
   */
  calculateHolographicSectorConstellations(): Array<{
    theme: SectorDiscoveryTheme;
    position: { x: number; y: number };
    connections: string[];
    glowIntensity: number;
  }> {
    const constellations: Array<{
      theme: SectorDiscoveryTheme;
      position: { x: number; y: number };
      connections: string[];
      glowIntensity: number;
    }> = [];

    // Position themes in a circular pattern
    const angleStep = (Math.PI * 2) / this.discoveryThemes.length;
    const radius = 200;

    for (let i = 0; i < this.discoveryThemes.length; i++) {
      const theme = this.discoveryThemes[i];
      const angle = i * angleStep;
      
      const position = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };

      // Calculate connections based on shared companies
      const connections: string[] = [];
      for (const otherTheme of this.discoveryThemes) {
        if (theme.id !== otherTheme.id) {
          const sharedCompanies = theme.companies.filter(company =>
            otherTheme.companies.includes(company)
          );
          if (sharedCompanies.length > 0) {
            connections.push(otherTheme.id);
          }
        }
      }

      const glowIntensity = theme.institutionalParticipation * this.holographicIntensity;

      constellations.push({
        theme,
        position,
        connections,
        glowIntensity
      });
    }

    return constellations;
  }

  /**
   * Calculate neural discovery maps
   */
  calculateNeuralDiscoveryMaps(): Array<{
    theme: SectorDiscoveryTheme;
    neuralNodes: Array<{ x: number; y: number; intensity: number }>;
    neuralConnections: Array<{ from: number; to: number; strength: number }>;
  }> {
    const maps: Array<{
      theme: SectorDiscoveryTheme;
      neuralNodes: Array<{ x: number; y: number; intensity: number }>;
      neuralConnections: Array<{ from: number; to: number; strength: number }>;
    }> = [];

    for (const theme of this.discoveryThemes) {
      const neuralNodes: Array<{ x: number; y: number; intensity: number }> = [];
      const neuralConnections: Array<{ from: number; to: number; strength: number }> = [];

      // Create neural nodes for each company
      for (let i = 0; i < theme.companies.length; i++) {
        const angle = (i / theme.companies.length) * Math.PI * 2;
        const radius = 50 + Math.random() * 30;
        
        neuralNodes.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          intensity: 0.5 + Math.random() * 0.5
        });
      }

      // Create connections between related companies
      for (let i = 0; i < neuralNodes.length; i++) {
        for (let j = i + 1; j < neuralNodes.length; j++) {
          if (Math.random() > 0.5) {
            neuralConnections.push({
              from: i,
              to: j,
              strength: 0.3 + Math.random() * 0.7
            });
          }
        }
      }

      maps.push({
        theme,
        neuralNodes,
        neuralConnections
      });
    }

    return maps;
  }

  /**
   * Calculate thematic exploration corridors
   */
  calculateThematicExplorationCorridors(): Array<{
    theme: SectorDiscoveryTheme;
    corridorWidth: number;
    corridorColor: string;
    corridorIntensity: number;
  }> {
    return this.discoveryThemes.map(theme => ({
      theme,
      corridorWidth: 50 + theme.institutionalParticipation * 50,
      corridorColor: theme.color,
      corridorIntensity: theme.healthometerAverage * this.holographicIntensity
    }));
  }

  /**
   * Calculate volumetric market ecosystems
   */
  calculateVolumetricMarketEcosystems(): Array<{
    theme: SectorDiscoveryTheme;
    ecosystemSize: number;
    ecosystemDepth: number;
    ecosystemGlow: number;
  }> {
    return this.discoveryThemes.map(theme => ({
      theme,
      ecosystemSize: 100 + theme.companies.length * 20,
      ecosystemDepth: theme.volatility * 100,
      ecosystemGlow: theme.institutionalParticipation * this.holographicIntensity
    }));
  }

  /**
   * Get theme interpretation
   */
  getThemeInterpretation(themeId: string): string | null {
    const theme = this.getDiscoveryThemeById(themeId);
    if (!theme) return null;

    let interpretation = `${theme.title} represents ${theme.description}. `;
    
    if (theme.healthometerAverage > 0.7) {
      interpretation += 'Companies in this theme show strong overall health. ';
    } else if (theme.healthometerAverage > 0.5) {
      interpretation += 'Companies in this theme show moderate health. ';
    } else {
      interpretation += 'Companies in this theme show mixed health indicators. ';
    }

    if (theme.institutionalParticipation > 0.7) {
      interpretation += 'High institutional participation indicates strong investor interest.';
    } else if (theme.institutionalParticipation > 0.5) {
      interpretation += 'Moderate institutional participation suggests balanced interest.';
    } else {
      interpretation += 'Lower institutional participation may indicate emerging opportunity.';
    }

    return interpretation;
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
   * Reset to default state
   */
  resetToDefault(): void {
    this.initializeDiscoveryThemes();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const sectorThemeDiscoverySystem = new SectorThemeDiscoverySystem();
