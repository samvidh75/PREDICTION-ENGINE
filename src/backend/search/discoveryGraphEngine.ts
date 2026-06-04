import type { DiscoveryEntity } from "../../services/discovery/discoveryTypes";
import { getDiscoveryIndex } from "../../services/discovery/discoveryIndex";

export type GraphNode = {
  id: string;
  kind: DiscoveryEntity["kind"];
  title: string;
};

export type GraphEdge = {
  fromId: string;
  toId: string;
  /**
   * A lightweight relationship signal. We keep this stringy + generic
   * so we can later swap it for SQL-backed relationship tables.
   */
  signal: string;
  strength: number; // 0..1
};

export type DiscoveryGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function tokenise(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s,_/.-]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * discoveryGraphEngine
 * - builds an in-memory relationship graph from discoveryIndex
 * - uses relationshipTags + relatedSectors + keyword overlaps
 * - intentionally generic: Phase 1 = in-memory; Phase 2 = Postgres indexing
 */
export class DiscoveryGraphEngine {
  private graph: DiscoveryGraph | null = null;

  build(): DiscoveryGraph {
    const index = getDiscoveryIndex();

    const nodes: GraphNode[] = index.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
    }));

    const edges: GraphEdge[] = [];

    // pre-tokenise relationship sources
    const meta = new Map<string, { tokens: string[]; kwTokens: string[]; relTokens: string[] }>();

    for (const e of index) {
      const relTokens = tokenise(e.relationshipTags.join(" "));
      const kwTokens = tokenise(e.keywords.join(" "));

      const detailsTokens = tokenise(
        [
          e.details?.executiveNarrative,
          e.details?.confidenceEnvironmentHint,
          e.details?.marketContextHint,
          (e.details?.relatedSectors ?? []).join(" "),
          e.details?.volatilityHint,
          e.details?.liquidityHint,
          e.details?.institutionalHint,
          e.details?.behaviouralHint,
        ]
          .filter(Boolean)
          .join(" "),
      );

      const tokens = Array.from(new Set([...relTokens, ...kwTokens, ...detailsTokens]));

      meta.set(e.id, { tokens, kwTokens, relTokens });
    }

    const byId = new Map(nodes.map((n) => [n.id, n]));

    for (let i = 0; i < index.length; i += 1) {
      for (let j = i + 1; j < index.length; j += 1) {
        const a = index[i];
        const b = index[j];

        // shared relationship signal: token overlap
        const ma = meta.get(a.id);
        const mb = meta.get(b.id);
        if (!ma || !mb) continue;

        const aTokens = new Set(ma.tokens);
        const bTokens = new Set(mb.tokens);

        let overlap = 0;
        for (const t of aTokens) {
          if (bTokens.has(t)) overlap += 1;
        }

        if (overlap <= 0) continue;

        const strength = Math.min(1, overlap / 7);

        // store as 2 directed edges for navigation
        const aNode = byId.get(a.id);
        const bNode = byId.get(b.id);
        if (!aNode || !bNode) continue;

        edges.push({ fromId: aNode.id, toId: bNode.id, signal: "token_overlap", strength });
        edges.push({ fromId: bNode.id, toId: aNode.id, signal: "token_overlap", strength });
      }
    }

    this.graph = { nodes, edges };
    return this.graph;
  }

  getGraph(): DiscoveryGraph {
    return this.graph ?? this.build();
  }

  /**
   * relatedFor
   * - returns the most connected nearby entities for a given entity (by strength)
   * - caller controls limit + filtering.
   */
  relatedFor(entityId: string, limit = 6): DiscoveryEntity[] {
    const index = getDiscoveryIndex();
    const entity = index.find((e) => e.id === entityId);
    if (!entity) return [];

    const g = this.getGraph();
    const scored: Array<{ id: string; score: number }> = [];

    for (const edge of g.edges) {
      if (edge.fromId === entityId) scored.push({ id: edge.toId, score: edge.strength });
    }

    scored.sort((a, b) => b.score - a.score);

    const ids = scored.slice(0, limit).map((s) => s.id);
    const set = new Set(ids);

    // preserve ranked order
    const byId = new Map(index.map((e) => [e.id, e]));
    const out: DiscoveryEntity[] = [];
    for (const id of ids) {
      const e = byId.get(id);
      if (e && set.has(id)) out.push(e);
    }
    return out;
  }
}

export const discoveryGraphEngine = new DiscoveryGraphEngine();
