import { RedisClient } from "redis";
import CacheProtocol from "./CacheProtocol";

function errorPrint(err: Error | null) {
    if (err) {
        console.error(err);
    }
}

export default class RedisCache implements CacheProtocol {
    redisClient: RedisClient;

    constructor(redisClient: RedisClient) {
        this.redisClient = redisClient;
    }

    get(cache: string, key: string, cb: (value: any | undefined) => void): void {
        this.redisClient.get(`${cache}::${key}`, function(err, reply) {
            if (err) {
                errorPrint(err);
                cb(undefined);
            } else {
                if (reply === null) {
                    cb(undefined);
                } else {
                    try {
                        var value = JSON.parse(reply);
                    } catch (parseErr) {
                        errorPrint(parseErr);
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
            errorPrint(err);
            return;
        }
        if (expire === undefined) {
            this.redisClient.set(`${cache}::${key}`, data, errorPrint);
        } else {
            this.redisClient.setex(`${cache}::${key}`, expire, data, errorPrint);
        }
    }

    del(cache: string, key: string): void {
        this.redisClient.del(`${cache}::${key}`, errorPrint);
    }

    clear(cache: string): void {
        this.scanAndDel(`${cache}::*`, "0");
    }

    scanAndDel(match: string, cursor: string) {
        this.redisClient.scan(cursor, "MATCH", match, "COUNT", "100", (err, reply) => {
            if (err) {
                errorPrint(err);
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
}
