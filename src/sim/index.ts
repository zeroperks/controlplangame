export type ComponentKey = "lb" | "app" | "db" | "cache" | "queue";

export interface ComponentDefinition {
  key: ComponentKey;
  name: string;
  baseCapacity: number;
  baseLatency: number;
  opEx: number;
}

export interface ComponentStatus {
  key: ComponentKey;
  capacity: number;
  load: number;
  utilization: number;
  latency: number;
}

export interface LinkFlows {
  lbToApp: number;
  appToDb: number;
  appToCache: number;
  cacheToDb: number;
  appToQueue: number;
  queueToDb: number;
}

export interface SimMetrics {
  tick: number;
  incomingRps: number;
  servedRps: number;
  errorRps: number;
  errorRate: number;
  totalLatency: number;
  p95Latency: number;
  costPerTick: number;
  revenuePerTick: number;
  cash: number;
  backlog: number;
  warning?: string;
  linkFlows: LinkFlows;
  components: Record<ComponentKey, ComponentStatus>;
}

export interface SimState {
  tick: number;
  incomingRps: number;
  timeoutMs: number;
  revenuePerReq: number;
  cash: number;
  appInstances: number;
  lbUpgrade: number;
  dbUpgrade: number;
  cacheEnabled: boolean;
  queueEnabled: boolean;
  cacheHitRate: number;
  backlog: number;
  errorStreak: number;
  lastMetrics: SimMetrics;
}

export const COMPONENTS: Record<ComponentKey, ComponentDefinition> = {
  lb: { key: "lb", name: "Load Balancer", baseCapacity: 6000, baseLatency: 8, opEx: 22 },
  app: { key: "app", name: "App Server", baseCapacity: 800, baseLatency: 22, opEx: 6 },
  db: { key: "db", name: "Database", baseCapacity: 900, baseLatency: 55, opEx: 28 },
  cache: { key: "cache", name: "Cache", baseCapacity: 4000, baseLatency: 6, opEx: 12 },
  queue: { key: "queue", name: "Queue", baseCapacity: 2000, baseLatency: 10, opEx: 9 }
};

const APP_INSTANCE_OP_EX = 8;
const LB_UPGRADE_CAP = 2000;
const DB_UPGRADE_CAP = 400;
const OVERLOAD_K = 8;
const QUEUE_LATENCY = 25;

export const createInitialState = (): SimState => {
  const base = {
    tick: 0,
    incomingRps: 1000,
    timeoutMs: 250,
    revenuePerReq: 0.002,
    cash: 250,
    appInstances: 2,
    lbUpgrade: 0,
    dbUpgrade: 0,
    cacheEnabled: false,
    queueEnabled: false,
    cacheHitRate: 0.6,
    backlog: 0,
    errorStreak: 0,
    lastMetrics: {} as SimMetrics
  };

  return {
    ...base,
    lastMetrics: computeMetrics(base)
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const computeMetrics = (state: SimState): SimMetrics => {
  const lbCapacity = COMPONENTS.lb.baseCapacity + state.lbUpgrade * LB_UPGRADE_CAP;
  const appCapacity = COMPONENTS.app.baseCapacity * state.appInstances;
  const dbCapacity = COMPONENTS.db.baseCapacity + state.dbUpgrade * DB_UPGRADE_CAP;

  const incoming = state.incomingRps;
  const appOut = Math.min(incoming, Math.min(lbCapacity, appCapacity));

  const cacheHitRate = state.cacheEnabled ? state.cacheHitRate : 0;
  const cachedServed = appOut * cacheHitRate;
  const dbDemand = appOut * (1 - cacheHitRate);

  let backlog = state.queueEnabled ? state.backlog : 0;
  let dbProcessed = 0;
  if (state.queueEnabled) {
    dbProcessed = Math.min(dbCapacity, dbDemand + backlog);
    backlog = Math.max(0, dbDemand + backlog - dbProcessed);
  } else {
    dbProcessed = Math.min(dbCapacity, dbDemand);
    backlog = 0;
  }

  const servedBeforeLatency = cachedServed + dbProcessed;
  const linkFlows: LinkFlows = {
    lbToApp: appOut,
    appToDb: !state.cacheEnabled && !state.queueEnabled ? appOut : 0,
    appToCache: state.cacheEnabled ? appOut : 0,
    cacheToDb: state.cacheEnabled ? dbDemand : 0,
    appToQueue: state.queueEnabled ? dbDemand : 0,
    queueToDb: state.queueEnabled ? dbProcessed : 0
  };

  const componentLoads: Record<ComponentKey, number> = {
    lb: incoming,
    app: appOut,
    db: dbDemand,
    cache: state.cacheEnabled ? appOut : 0,
    queue: state.queueEnabled ? dbDemand : 0
  };

  const componentCapacities: Record<ComponentKey, number> = {
    lb: lbCapacity,
    app: appCapacity,
    db: dbCapacity,
    cache: COMPONENTS.cache.baseCapacity,
    queue: COMPONENTS.queue.baseCapacity
  };

  const overloadPenalty = (key: ComponentKey) => {
    const util = componentLoads[key] / componentCapacities[key];
    if (util <= 1) return 0;
    return COMPONENTS[key].baseLatency * OVERLOAD_K * (util - 1) * (util - 1);
  };

  const baseLatencySum =
    COMPONENTS.lb.baseLatency + COMPONENTS.app.baseLatency + COMPONENTS.db.baseLatency;
  const cacheLatencyReduction = state.cacheEnabled ? COMPONENTS.db.baseLatency * cacheHitRate : 0;

  const overloadTotal =
    overloadPenalty("lb") +
    overloadPenalty("app") +
    overloadPenalty("db") +
    (state.cacheEnabled ? overloadPenalty("cache") : 0) +
    (state.queueEnabled ? overloadPenalty("queue") : 0);

  let totalLatency = baseLatencySum + overloadTotal;
  if (state.queueEnabled) totalLatency += QUEUE_LATENCY;
  totalLatency = Math.max(30, totalLatency - cacheLatencyReduction);

  const latencyErrorRate = totalLatency > state.timeoutMs ? (totalLatency - state.timeoutMs) / totalLatency : 0;
  const servedAfterLatency = servedBeforeLatency * (1 - latencyErrorRate);
  const errorRps = Math.max(0, incoming - servedAfterLatency);
  const servedRps = Math.max(0, incoming - errorRps);
  const errorRate = incoming > 0 ? errorRps / incoming : 0;

  const revenuePerTick = servedRps * state.revenuePerReq;
  const infraCost =
    COMPONENTS.lb.opEx +
    COMPONENTS.db.opEx +
    state.appInstances * APP_INSTANCE_OP_EX +
    (state.cacheEnabled ? COMPONENTS.cache.opEx : 0) +
    (state.queueEnabled ? COMPONENTS.queue.opEx : 0);

  const p95Latency = totalLatency * 1.2;

  const components: Record<ComponentKey, ComponentStatus> = {
    lb: {
      key: "lb",
      capacity: lbCapacity,
      load: componentLoads.lb,
      utilization: clamp(componentLoads.lb / lbCapacity, 0, 2.5),
      latency: COMPONENTS.lb.baseLatency
    },
    app: {
      key: "app",
      capacity: appCapacity,
      load: componentLoads.app,
      utilization: clamp(componentLoads.app / appCapacity, 0, 2.5),
      latency: COMPONENTS.app.baseLatency
    },
    db: {
      key: "db",
      capacity: dbCapacity,
      load: componentLoads.db,
      utilization: clamp(componentLoads.db / dbCapacity, 0, 2.5),
      latency: COMPONENTS.db.baseLatency
    },
    cache: {
      key: "cache",
      capacity: componentCapacities.cache,
      load: componentLoads.cache,
      utilization: clamp(componentLoads.cache / componentCapacities.cache, 0, 2.5),
      latency: COMPONENTS.cache.baseLatency
    },
    queue: {
      key: "queue",
      capacity: componentCapacities.queue,
      load: componentLoads.queue,
      utilization: clamp(componentLoads.queue / componentCapacities.queue, 0, 2.5),
      latency: COMPONENTS.queue.baseLatency
    }
  };

  let warning: string | undefined;
  if (state.cash < 0) warning = "Cash below $0 — restructure quickly.";
  if (state.errorStreak >= 5) warning = "Error rate exceeded 20% for 5 ticks.";

  return {
    tick: state.tick,
    incomingRps: incoming,
    servedRps,
    errorRps,
    errorRate,
    totalLatency,
    p95Latency,
    costPerTick: infraCost,
    revenuePerTick,
    cash: state.cash,
    backlog,
    warning,
    linkFlows,
    components
  };
};

export const tickSim = (state: SimState): SimState => {
  const metrics = computeMetrics(state);
  const nextCash = state.cash + metrics.revenuePerTick - metrics.costPerTick;
  const nextErrorStreak = metrics.errorRate > 0.2 ? state.errorStreak + 1 : 0;
  let warning = "";
  if (nextCash < 0) warning = "Cash below $0 — restructure quickly.";
  if (nextErrorStreak >= 5) warning = "Error rate exceeded 20% for 5 ticks.";

  return {
    ...state,
    tick: state.tick + 1,
    cash: nextCash,
    backlog: metrics.backlog,
    errorStreak: nextErrorStreak,
    lastMetrics: {
      ...metrics,
      cash: nextCash,
      warning: warning || undefined
    }
  };
};

export const formatNumber = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 });

export const formatMoney = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
