import { RedisClient } from "redis";
import CacheProtocol from "./CacheProtocol";

// function errorPrint(err: Error | null) {
//     if (err) {
//         console.error(err);
//     }
// }

interface ILogger {
    debug(...args: any[]): void;

    info(...args: any[]): void;

    warn(...args: any[]): void;

    error(...args: any[]): void;
}

class RedisCacheLocker {
    lockName: string;
    locked: boolean;
    redisCache: RedisCache;
    constructor(redisCache: RedisCache, cache: string, key: string) {
        this.lockName = `${cache}::${key}::LOCK`;
        this.locked = false;
        this.redisCache = redisCache;
    }

    lock(expire: number, cb: (result: boolean) => void) {
        if (this.locked) {
            throw new Error("Redis cache locker Repeated locking!!");
        }
        this.locked = true;
        this._lock(expire, cb);
    }

    _lock(expire: number, cb: (result: boolean) => void) {
        this.redisCache.redisClient.set(this.lockName, "1", "ex", expire, "nx", (err, reply) => {
            if (err) {
                this.redisCache.logger.error(err);
                this.locked = false;
                cb(false);
            } else {
                if (reply === "OK") {
                    cb(true);
                } else {
                    this._lock(expire, cb);
                }
            }
        });
    }

    unlock() {
        if (!this.locked) {
            return;
        }
        this.locked = false;
        this.redisCache.redisClient.del(this.lockName, err => {
            if (err) {
                this.redisCache.logger.error(err);
            }
        });
    }
}

export default class RedisCache implements CacheProtocol {
    readonly redisClient: RedisClient;
    readonly logger: ILogger;
    constructor(redisClient: RedisClient, logger: ILogger) {
        this.redisClient = redisClient;
        this.logger = logger;
    }

    get(cache: string, key: string, cb: (value: any | undefined) => void): void {
        this.redisClient.get(`${cache}::${key}`, (err, reply) => {
            if (err) {
                if (err) {
                    this.logger.error(err);
                }
                cb(undefined);
            } else {
                if (reply === null) {
                    cb(undefined);
                } else {
                    try {
                        var value = JSON.parse(reply);
                    } catch (parseErr) {
                        if (parseErr) {
                            this.logger.error(err);
                        }
                        cb(undefined);
                        return;
                    }
                    cb(value);
                }
            }
        });
    }

    set(cache: string, key: string, expire: undefined | number, value: any): void {
        try {
            var data = JSON.stringify(value);
        } catch (err) {
            if (err) {
                this.logger.error(err);
            }
            return;
        }
        if (expire === undefined) {
            this.redisClient.set(`${cache}::${key}`, data, err => {
                if (err) {
                    this.logger.error(err);
                }
            });
        } else {
            this.redisClient.setex(`${cache}::${key}`, expire, data, err => {
                if (err) {
                    this.logger.error(err);
                }
            });
        }
    }

    del(cache: string, key: string): void {
        this.redisClient.del(`${cache}::${key}`, err => {
            if (err) {
                this.logger.error(err);
            }
        });
    }

    clear(cache: string): void {
        this.scanAndDel(`${cache}::*`, "0");
    }

    scanAndDel(match: string, cursor: string) {
        this.redisClient.scan(cursor, "MATCH", match, "COUNT", "100", (err, reply) => {
            if (err) {
                this.logger.error(err);
            } else {
                const [newCursor, keys] = reply;
                if (keys.length) {
                    this.redisClient.del(keys);
                }
                if (newCursor !== "0") {
                    this.scanAndDel(match, newCursor);
                }
            }
        });
    }

    create_locker(cache: string, key: string) {
        return new RedisCacheLocker(this, cache, key);
    }
}
