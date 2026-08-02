import {
  DataWarehouseQueryEngine,
  InMemoryWarehouseRunner,
  ScreenerRow,
} from '../../services/analytics/DataWarehouseQueryEngine';
import { OrderBookBroadcaster, BroadcastClient } from '../../backend/websocket/OrderBookBroadcaster';
import { OrderBookSnapshot } from '../../services/microstructure/types';

const ROWS: ScreenerRow[] = [
  { symbol: 'TCS', pe_ratio: 28, conviction_score: 82, sector: 'tech', close_price: 3900 },
  { symbol: 'INFY', pe_ratio: 24, conviction_score: 75, sector: 'tech', close_price: 1500 },
  { symbol: 'HDFCBANK', pe_ratio: 18, conviction_score: 71, sector: 'banking', close_price: 1650 },
  { symbol: 'ITC', pe_ratio: 25, conviction_score: 60, sector: 'fmcg', close_price: 430 },
  { symbol: 'SUZLON', pe_ratio: 12, conviction_score: 45, sector: 'energy', close_price: 55 },
];

describe('DataWarehouseQueryEngine', () => {
  const makeEngine = () => new DataWarehouseQueryEngine(new InMemoryWarehouseRunner(ROWS));

  it('filters with AND logic', async () => {
    const result = await makeEngine().execute({
      criteria: [
        { field: 'pe_ratio', operator: 'lt', value: 26 },
        { field: 'conviction_score', operator: 'gte', value: 70 },
      ],
    });
    expect(result.rows.map(r => r.symbol).sort()).toEqual(['HDFCBANK', 'INFY']);
  });

  it('filters with OR logic', async () => {
    const result = await makeEngine().execute({
      criteria: [
        { field: 'sector', operator: 'eq', value: 'fmcg' },
        { field: 'sector', operator: 'eq', value: 'energy' },
      ],
      logic: 'or',
    });
    expect(result.rows.map(r => r.symbol).sort()).toEqual(['ITC', 'SUZLON']);
  });

  it('supports in operator, sorting, and limit', async () => {
    const result = await makeEngine().execute({
      criteria: [{ field: 'sector', operator: 'in', value: ['tech', 'banking'] }],
      sortBy: 'conviction_score',
      sortDir: 'desc',
      limit: 2,
    });
    expect(result.rows.map(r => r.symbol)).toEqual(['TCS', 'INFY']);
    expect(result.totalMatches).toBe(3);
  });

  it('serves repeat queries from cache', async () => {
    const engine = makeEngine();
    const query = { criteria: [{ field: 'pe_ratio' as const, operator: 'gt' as const, value: 20 }] };
    const first = await engine.execute(query);
    const second = await engine.execute(query);
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    engine.invalidateCache();
    const third = await engine.execute(query);
    expect(third.fromCache).toBe(false);
  });

  it('rejects malformed queries', async () => {
    const engine = makeEngine();
    await expect(engine.execute({ criteria: [] })).rejects.toThrow();
    await expect(
      engine.execute({ criteria: [{ field: 'not_a_field' as never, operator: 'gt', value: 1 }] }),
    ).rejects.toThrow();
    await expect(
      engine.execute({ criteria: [{ field: 'pe_ratio', operator: 'gt', value: 'abc' }] }),
    ).rejects.toThrow();
    await expect(
      engine.execute({ criteria: [{ field: 'sector', operator: 'in', value: 'tech' }] }),
    ).rejects.toThrow();
  });
});

describe('OrderBookBroadcaster', () => {
  function makeClient(id: string): BroadcastClient & { received: string[]; open: boolean } {
    const client = {
      id,
      received: [] as string[],
      open: true,
      send(payload: string) {
        if (!client.open) throw new Error('closed');
        client.received.push(payload);
      },
      isOpen: () => client.open,
    };
    return client;
  }

  const snapshot: OrderBookSnapshot = {
    ticker: 'TCS',
    timestamp: 1700000000000,
    bidPrice: 3899,
    bidVolume: 100,
    askPrice: 3901,
    askVolume: 120,
    spread: 2,
    spreadPercent: 0.05,
    mid: 3900,
    depth10Imbalance: -0.09,
    totalBidVolume: 5000,
    totalAskVolume: 6000,
  };

  it('delivers snapshots only to subscribers of that ticker', () => {
    const broadcaster = new OrderBookBroadcaster();
    const a = makeClient('a');
    const b = makeClient('b');
    broadcaster.addClient(a);
    broadcaster.addClient(b);
    broadcaster.subscribe('a', 'TCS');
    broadcaster.subscribe('b', 'INFY');

    broadcaster.broadcast(snapshot);
    expect(a.received).toHaveLength(1);
    expect(b.received).toHaveLength(0);
    expect(JSON.parse(a.received[0]).data.ticker).toBe('TCS');
  });

  it('prunes dead clients on broadcast', () => {
    const broadcaster = new OrderBookBroadcaster();
    const a = makeClient('a');
    broadcaster.addClient(a);
    broadcaster.subscribe('a', 'TCS');
    a.open = false;

    broadcaster.broadcast(snapshot);
    expect(broadcaster.stats().clients).toBe(0);
  });

  it('emits roomCreated/roomEmpty for provider lifecycle management', () => {
    const broadcaster = new OrderBookBroadcaster();
    const created: string[] = [];
    const emptied: string[] = [];
    broadcaster.on('roomCreated', t => created.push(t));
    broadcaster.on('roomEmpty', t => emptied.push(t));

    const a = makeClient('a');
    broadcaster.addClient(a);
    broadcaster.subscribe('a', 'TCS');
    broadcaster.unsubscribe('a', 'TCS');
    expect(created).toEqual(['TCS']);
    expect(emptied).toEqual(['TCS']);
  });

  it('enforces per-client subscription limit', () => {
    const broadcaster = new OrderBookBroadcaster();
    const a = makeClient('a');
    broadcaster.addClient(a);
    for (let i = 0; i < 50; i++) broadcaster.subscribe('a', `SYM${i}`);
    expect(() => broadcaster.subscribe('a', 'ONE_TOO_MANY')).toThrow();
  });

  it('rejects subscribing an unknown client', () => {
    const broadcaster = new OrderBookBroadcaster();
    expect(() => broadcaster.subscribe('ghost', 'TCS')).toThrow();
  });
});
