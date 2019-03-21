export default interface CacheProtocol {
    get(cache: string, key: string, cb: (value: any | undefined) => void): void;
    set(cache: string, key: string, expire: undefined | number, value: any): void;
    del(cache: string, key: string): void;
    clear(cache: string): void;
    lock(cache: string, key: string, expire: number, cb: (result: boolean) => void): void;
    unlock(cache: string, key: string): void;
}
