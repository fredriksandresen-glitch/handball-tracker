var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _client, _result, _queries, _options, _observers, _combinedResult, _lastCombine, _lastResult, _lastQueryHashes, _observerMatches, _QueriesObserver_instances, trackResult_fn, combineResult_fn, findMatchingObservers_fn, onUpdate_fn, notify_fn, _a;
import { k as Subscribable, n as notifyManager, s as shallowEqualObjects, l as replaceEqualDeep, Q as QueryObserver, m as useQueryClient, o as useIsRestoring, p as useQueryErrorResetBoundary, r as reactExports, q as ensureSuspenseTimers, t as ensurePreventErrorBoundaryRetry, v as useClearResetErrorBoundary, w as noop, x as shouldSuspend, y as fetchOptimistic, z as getHasError, b as useActor, d as useQuery, e as createActor } from "./index-CPElKy7J.js";
import { g as getStaticProfile, a as mapClawdbotMatchStats, h as fetchClawdbotPlayerProfile, i as mapClawdbotPlayer, m as mapClawdbotSeasonStats } from "./clawdbotPlayerProfile-CiM1Xaxo.js";
function difference(array1, array2) {
  const excludeSet = new Set(array2);
  return array1.filter((x) => !excludeSet.has(x));
}
function replaceAt(array, index, value) {
  const copy = array.slice(0);
  copy[index] = value;
  return copy;
}
var QueriesObserver = (_a = class extends Subscribable {
  constructor(client, queries, options) {
    super();
    __privateAdd(this, _QueriesObserver_instances);
    __privateAdd(this, _client);
    __privateAdd(this, _result);
    __privateAdd(this, _queries);
    __privateAdd(this, _options);
    __privateAdd(this, _observers);
    __privateAdd(this, _combinedResult);
    __privateAdd(this, _lastCombine);
    __privateAdd(this, _lastResult);
    __privateAdd(this, _lastQueryHashes);
    __privateAdd(this, _observerMatches, []);
    __privateSet(this, _client, client);
    __privateSet(this, _options, options);
    __privateSet(this, _queries, []);
    __privateSet(this, _observers, []);
    __privateSet(this, _result, []);
    this.setQueries(queries);
  }
  onSubscribe() {
    if (this.listeners.size === 1) {
      __privateGet(this, _observers).forEach((observer) => {
        observer.subscribe((result) => {
          __privateMethod(this, _QueriesObserver_instances, onUpdate_fn).call(this, observer, result);
        });
      });
    }
  }
  onUnsubscribe() {
    if (!this.listeners.size) {
      this.destroy();
    }
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set();
    __privateGet(this, _observers).forEach((observer) => {
      observer.destroy();
    });
  }
  setQueries(queries, options) {
    __privateSet(this, _queries, queries);
    __privateSet(this, _options, options);
    notifyManager.batch(() => {
      const prevObservers = __privateGet(this, _observers);
      const newObserverMatches = __privateMethod(this, _QueriesObserver_instances, findMatchingObservers_fn).call(this, __privateGet(this, _queries));
      newObserverMatches.forEach(
        (match) => match.observer.setOptions(match.defaultedQueryOptions)
      );
      const newObservers = newObserverMatches.map((match) => match.observer);
      const newResult = newObservers.map(
        (observer) => observer.getCurrentResult()
      );
      const hasLengthChange = prevObservers.length !== newObservers.length;
      const hasIndexChange = newObservers.some(
        (observer, index) => observer !== prevObservers[index]
      );
      const hasStructuralChange = hasLengthChange || hasIndexChange;
      const hasResultChange = hasStructuralChange ? true : newResult.some((result, index) => {
        const prev = __privateGet(this, _result)[index];
        return !prev || !shallowEqualObjects(result, prev);
      });
      if (!hasStructuralChange && !hasResultChange) return;
      if (hasStructuralChange) {
        __privateSet(this, _observerMatches, newObserverMatches);
        __privateSet(this, _observers, newObservers);
      }
      __privateSet(this, _result, newResult);
      if (!this.hasListeners()) return;
      if (hasStructuralChange) {
        difference(prevObservers, newObservers).forEach((observer) => {
          observer.destroy();
        });
        difference(newObservers, prevObservers).forEach((observer) => {
          observer.subscribe((result) => {
            __privateMethod(this, _QueriesObserver_instances, onUpdate_fn).call(this, observer, result);
          });
        });
      }
      __privateMethod(this, _QueriesObserver_instances, notify_fn).call(this);
    });
  }
  getCurrentResult() {
    return __privateGet(this, _result);
  }
  getQueries() {
    return __privateGet(this, _observers).map((observer) => observer.getCurrentQuery());
  }
  getObservers() {
    return __privateGet(this, _observers);
  }
  getOptimisticResult(queries, combine) {
    const matches = __privateMethod(this, _QueriesObserver_instances, findMatchingObservers_fn).call(this, queries);
    const result = matches.map(
      (match) => match.observer.getOptimisticResult(match.defaultedQueryOptions)
    );
    const queryHashes = matches.map(
      (match) => match.defaultedQueryOptions.queryHash
    );
    return [
      result,
      (r) => {
        return __privateMethod(this, _QueriesObserver_instances, combineResult_fn).call(this, r ?? result, combine, queryHashes);
      },
      () => {
        return __privateMethod(this, _QueriesObserver_instances, trackResult_fn).call(this, result, matches);
      }
    ];
  }
}, _client = new WeakMap(), _result = new WeakMap(), _queries = new WeakMap(), _options = new WeakMap(), _observers = new WeakMap(), _combinedResult = new WeakMap(), _lastCombine = new WeakMap(), _lastResult = new WeakMap(), _lastQueryHashes = new WeakMap(), _observerMatches = new WeakMap(), _QueriesObserver_instances = new WeakSet(), trackResult_fn = function(result, matches) {
  return matches.map((match, index) => {
    const observerResult = result[index];
    return !match.defaultedQueryOptions.notifyOnChangeProps ? match.observer.trackResult(observerResult, (accessedProp) => {
      matches.forEach((m) => {
        m.observer.trackProp(accessedProp);
      });
    }) : observerResult;
  });
}, combineResult_fn = function(input, combine, queryHashes) {
  if (combine) {
    const lastHashes = __privateGet(this, _lastQueryHashes);
    const queryHashesChanged = queryHashes !== void 0 && lastHashes !== void 0 && (lastHashes.length !== queryHashes.length || queryHashes.some((hash, i) => hash !== lastHashes[i]));
    if (!__privateGet(this, _combinedResult) || __privateGet(this, _result) !== __privateGet(this, _lastResult) || queryHashesChanged || combine !== __privateGet(this, _lastCombine)) {
      __privateSet(this, _lastCombine, combine);
      __privateSet(this, _lastResult, __privateGet(this, _result));
      if (queryHashes !== void 0) {
        __privateSet(this, _lastQueryHashes, queryHashes);
      }
      __privateSet(this, _combinedResult, replaceEqualDeep(
        __privateGet(this, _combinedResult),
        combine(input)
      ));
    }
    return __privateGet(this, _combinedResult);
  }
  return input;
}, findMatchingObservers_fn = function(queries) {
  const prevObserversMap = /* @__PURE__ */ new Map();
  __privateGet(this, _observers).forEach((observer) => {
    const key = observer.options.queryHash;
    if (!key) return;
    const previousObservers = prevObserversMap.get(key);
    if (previousObservers) {
      previousObservers.push(observer);
    } else {
      prevObserversMap.set(key, [observer]);
    }
  });
  const observers = [];
  queries.forEach((options) => {
    var _a2;
    const defaultedOptions = __privateGet(this, _client).defaultQueryOptions(options);
    const match = (_a2 = prevObserversMap.get(defaultedOptions.queryHash)) == null ? void 0 : _a2.shift();
    const observer = match ?? new QueryObserver(__privateGet(this, _client), defaultedOptions);
    observers.push({
      defaultedQueryOptions: defaultedOptions,
      observer
    });
  });
  return observers;
}, onUpdate_fn = function(observer, result) {
  const index = __privateGet(this, _observers).indexOf(observer);
  if (index !== -1) {
    __privateSet(this, _result, replaceAt(__privateGet(this, _result), index, result));
    __privateMethod(this, _QueriesObserver_instances, notify_fn).call(this);
  }
}, notify_fn = function() {
  var _a2;
  if (this.hasListeners()) {
    const previousResult = __privateGet(this, _combinedResult);
    const newTracked = __privateMethod(this, _QueriesObserver_instances, trackResult_fn).call(this, __privateGet(this, _result), __privateGet(this, _observerMatches));
    const newResult = __privateMethod(this, _QueriesObserver_instances, combineResult_fn).call(this, newTracked, (_a2 = __privateGet(this, _options)) == null ? void 0 : _a2.combine);
    if (previousResult !== newResult) {
      notifyManager.batch(() => {
        this.listeners.forEach((listener) => {
          listener(__privateGet(this, _result));
        });
      });
    }
  }
}, _a);
function useQueries({
  queries,
  ...options
}, queryClient) {
  const client = useQueryClient();
  const isRestoring = useIsRestoring();
  const errorResetBoundary = useQueryErrorResetBoundary();
  const defaultedQueries = reactExports.useMemo(
    () => queries.map((opts) => {
      const defaultedOptions = client.defaultQueryOptions(
        opts
      );
      defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
      return defaultedOptions;
    }),
    [queries, client, isRestoring]
  );
  defaultedQueries.forEach((queryOptions) => {
    ensureSuspenseTimers(queryOptions);
    const query = client.getQueryCache().get(queryOptions.queryHash);
    ensurePreventErrorBoundaryRetry(queryOptions, errorResetBoundary, query);
  });
  useClearResetErrorBoundary(errorResetBoundary);
  const [observer] = reactExports.useState(
    () => new QueriesObserver(
      client,
      defaultedQueries,
      options
    )
  );
  const [optimisticResult, getCombinedResult, trackResult] = observer.getOptimisticResult(
    defaultedQueries,
    options.combine
  );
  const shouldSubscribe = !isRestoring && options.subscribed !== false;
  reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => shouldSubscribe ? observer.subscribe(notifyManager.batchCalls(onStoreChange)) : noop,
      [observer, shouldSubscribe]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  reactExports.useEffect(() => {
    observer.setQueries(
      defaultedQueries,
      options
    );
  }, [defaultedQueries, options, observer]);
  const shouldAtLeastOneSuspend = optimisticResult.some(
    (result, index) => shouldSuspend(defaultedQueries[index], result)
  );
  const suspensePromises = shouldAtLeastOneSuspend ? optimisticResult.flatMap((result, index) => {
    const opts = defaultedQueries[index];
    if (opts && shouldSuspend(opts, result)) {
      const queryObserver = new QueryObserver(client, opts);
      return fetchOptimistic(opts, queryObserver, errorResetBoundary);
    }
    return [];
  }) : [];
  if (suspensePromises.length > 0) {
    throw Promise.all(suspensePromises);
  }
  const firstSingleResultWhichShouldThrow = optimisticResult.find(
    (result, index) => {
      const query = defaultedQueries[index];
      return query && getHasError({
        result,
        errorResetBoundary,
        throwOnError: query.throwOnError,
        query: client.getQueryCache().get(query.queryHash),
        suspense: query.suspense
      });
    }
  );
  if (firstSingleResultWhichShouldThrow == null ? void 0 : firstSingleResultWhichShouldThrow.error) {
    throw firstSingleResultWhichShouldThrow.error;
  }
  return getCombinedResult(trackResult());
}
const STATIC_STALE_TIME = Number.POSITIVE_INFINITY;
const STATIC_GC_TIME = 30 * 6e4;
function usePlayer(id) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(id);
  return useQuery({
    queryKey: ["player", id.toString()],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotPlayer(staticProfile);
      const clawdbotProfile = await fetchClawdbotPlayerProfile(id).catch(() => null);
      if (clawdbotProfile) return mapClawdbotPlayer(clawdbotProfile);
      if (!actor) return null;
      return actor.getPlayer(id);
    },
    enabled: !isFetching || !!staticProfile,
    initialData: staticProfile ? mapClawdbotPlayer(staticProfile) : void 0,
    staleTime: staticProfile ? STATIC_STALE_TIME : 6e4,
    gcTime: STATIC_GC_TIME
  });
}
function usePlayerMatchStats(playerId) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(playerId);
  return useQuery({
    queryKey: ["playerMatchStats", playerId.toString()],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotMatchStats(staticProfile);
      const clawdbotProfile = await fetchClawdbotPlayerProfile(playerId).catch(
        () => null
      );
      if (clawdbotProfile) return mapClawdbotMatchStats(clawdbotProfile);
      if (!actor) return [];
      return actor.getPlayerMatchStats(playerId);
    },
    enabled: !isFetching || !!staticProfile,
    initialData: staticProfile ? mapClawdbotMatchStats(staticProfile) : void 0,
    staleTime: staticProfile ? STATIC_STALE_TIME : 6e4,
    gcTime: STATIC_GC_TIME
  });
}
function usePlayerSeasonStats(playerId) {
  const { actor, isFetching } = useActor(createActor);
  const staticProfile = getStaticProfile(playerId);
  return useQuery({
    queryKey: ["playerSeasonStats", playerId.toString()],
    queryFn: async () => {
      if (staticProfile) return mapClawdbotSeasonStats(staticProfile);
      const clawdbotProfile = await fetchClawdbotPlayerProfile(playerId).catch(
        () => null
      );
      if (clawdbotProfile) return mapClawdbotSeasonStats(clawdbotProfile);
      if (!actor) return null;
      return actor.getPlayerSeasonStats(playerId);
    },
    enabled: !isFetching || !!staticProfile,
    initialData: staticProfile ? mapClawdbotSeasonStats(staticProfile) : void 0,
    staleTime: staticProfile ? STATIC_STALE_TIME : 6e4,
    gcTime: STATIC_GC_TIME
  });
}
function usePlayerMatchStatsBatch(ids) {
  const { actor, isFetching } = useActor(createActor);
  const uniqueIds = reactExports.useMemo(
    () => Array.from(new Set(ids.map((id) => id.toString()))).map(BigInt),
    [ids]
  );
  const results = useQueries({
    queries: uniqueIds.map((id) => {
      const staticProfile = getStaticProfile(id);
      return {
        queryKey: ["playerMatchStats", id.toString()],
        queryFn: async () => {
          if (staticProfile) return mapClawdbotMatchStats(staticProfile);
          const clawdbotProfile = await fetchClawdbotPlayerProfile(id).catch(
            () => null
          );
          if (clawdbotProfile) return mapClawdbotMatchStats(clawdbotProfile);
          if (!actor) return [];
          return actor.getPlayerMatchStats(id);
        },
        enabled: !isFetching || !!staticProfile,
        initialData: staticProfile ? mapClawdbotMatchStats(staticProfile) : void 0,
        staleTime: staticProfile ? STATIC_STALE_TIME : 6e4,
        gcTime: STATIC_GC_TIME
      };
    })
  });
  return reactExports.useMemo(() => {
    const map = {};
    for (let i = 0; i < uniqueIds.length; i++) {
      map[uniqueIds[i].toString()] = results[i].data ?? [];
    }
    return map;
  }, [uniqueIds, results]);
}
export {
  usePlayer as a,
  usePlayerSeasonStats as b,
  usePlayerMatchStats as c,
  usePlayerMatchStatsBatch as u
};
