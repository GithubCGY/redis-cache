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

    _lock(lock: string, expire: number, cb: (result: boolean) => void) {
        this.redisClient.set(lock, "1", "ex", expire, "nx", (err, reply) => {
            if (err) {
                this.logger.error(err);
                cb(false);
            } else {
                if (reply === "OK") {
                    cb(true);
                } else {
                    this._lock(lock, expire, cb);
                }
            }
        });
    }

    lock(cache: string, key: string, expire: number, cb: (result: boolean) => void) {
        this._lock(`${cache}::${key}::LOCK`, expire, cb);
    }

    unlock(cache: string, key: string) {
        this.redisClient.del(`${cache}::${key}::LOCK`, err => {
            if (err) {
                this.logger.error(err);
            }
        });
    }
}
