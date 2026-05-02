export async function jsonBody<T = any>(res: Response): Promise<T> {
    return (await res.json()) as T
}
