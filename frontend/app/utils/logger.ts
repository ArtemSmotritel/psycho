const isProd = import.meta.env.PROD

export function logIfNotProd(...args: unknown[]) {
    if (!isProd) {
        console.error(...args)
    }
}
