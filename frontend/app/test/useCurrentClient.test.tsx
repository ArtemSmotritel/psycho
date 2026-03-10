import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockGetById = vi.fn()

vi.mock('~/services/client.service', () => ({
    clientService: {
        getById: (...args: any[]) => mockGetById(...args),
    },
}))

import { useCurrentClient } from '~/hooks/useCurrentClient'

function wrapper({ clientId }: { clientId: string }) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <MemoryRouter initialEntries={[`/psycho/clients/${clientId}`]}>
                <Routes>
                    <Route path="/psycho/clients/:clientId" element={<>{children}</>} />
                </Routes>
            </MemoryRouter>
        )
    }
}

describe('useCurrentClient', () => {
    beforeEach(() => {
        mockGetById.mockReset()
    })

    it('returns null while loading', () => {
        mockGetById.mockReturnValue(new Promise(() => {}))

        const { result } = renderHook(() => useCurrentClient(), {
            wrapper: wrapper({ clientId: 'client-1' }),
        })

        expect(result.current).toBeNull()
    })

    it('returns the correct client object after fetch', async () => {
        const mockClient = {
            id: 'client-1',
            name: 'Alice',
            email: 'alice@example.com',
            image: null,
        }
        mockGetById.mockResolvedValue({ data: { client: mockClient } })

        const { result } = renderHook(() => useCurrentClient(), {
            wrapper: wrapper({ clientId: 'client-1' }),
        })

        await waitFor(() => {
            expect(result.current).toEqual(mockClient)
        })
    })

    it('returns null on 404 (API failure)', async () => {
        mockGetById.mockRejectedValue({ response: { status: 404 } })

        const { result } = renderHook(() => useCurrentClient(), {
            wrapper: wrapper({ clientId: 'unknown-id' }),
        })

        await waitFor(() => {
            expect(result.current).toBeNull()
        })
    })
})
