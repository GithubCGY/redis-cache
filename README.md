# redis-cache

[![npm version](https://badge.fury.io/js/%40chengaoyuan%2Fredis-cache.svg)](https://badge.fury.io/js/%40chengaoyuan%2Fredis-cache)
[![install size](https://packagephobia.now.sh/badge?p=@chengaoyuan/redis-cache)](https://packagephobia.now.sh/result?p=@chengaoyuan/redis-cache)
[![NPM Downloads](https://img.shields.io/npm/dm/@chengaoyuan/redis-cache.svg?style=flat)](https://npmcharts.com/compare/@chengaoyuan/redis-cache?minimal=true)

## Installation

    $ npm install @chengaoyuan/redis-cache

## Usage

```ts
import { RedisClient } from "redis";
import RedisCache from "@chengaoyuan/redis-cache";
import { CacheInit, Cacheable, CachePut, CacheEvict } from "@chengaoyuan/cache";
CacheInit(
    new RedisCache(
        new RedisClient({
            host: "127.0.0.1",
            port: 6379,
            password: "password",
            db: 10
        })
    )
);

class Test {
    datas: { [key: string]: any };
    constructor() {
        this.datas = {};
    }

    @Cacheable({
        cache: "Test",
        key: "id",
        expire: 30,
        condition: "id >= 10"
    })
    async getData(id: number) {
        return this.datas[id];
    }

    @CacheEvict({
        cache: "Test",
        key: "id"
    })
    async setData(id: number, data: any) {
        this.datas[id] = data;
    }

    @CachePut({
        cache: "Test",
        key: "id",
        expire: 30
    })
    async getDataEx(id: number) {
        return this.datas[id];
    }
}

const t = new Test();
(async function() {
    console.log(await t.getData(10));
    console.log(await t.getData(10));
    t.setData(10, { id: 123, name: "gg" });
    console.log(await t.getData(10));
    console.log(await t.getData(10));
    console.log(await t.getDataEx(10));
})();
```
