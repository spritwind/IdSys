import { api } from './api';
import type { ClientApiDto, ClientsApiDto } from '@/types/client';

export const clientService = {
    async getClients(search: string = '', page: number = 1, pageSize: number = 10): Promise<ClientsApiDto> {
        const response = await api.get<ClientsApiDto>('/Clients', {
            params: { searchText: search, page, pageSize }
        });
        return response.data;
    },

    async getClient(id: number): Promise<ClientApiDto> {
        const response = await api.get<ClientApiDto>(`/Clients/${id}`);
        return response.data;
    },

    async createClient(client: ClientApiDto): Promise<number> {
        const response = await api.post('/Clients', client);
        // 通常 created endpoint 會回傳 ID 或完整物件，這邊假設後端回傳 201 Created 和 ID 於 Location header 或 body
        // 根據 Controller: return CreatedAtAction(nameof(Get), new { id }, client);
        // 所以 response.data 應該是 client 物件 (帶有 ID)
        return response.data.id;
    },

    async updateClient(client: ClientApiDto): Promise<void> {
        await api.put('/Clients', client);
    },

    async deleteClient(id: number): Promise<void> {
        await api.delete(`/Clients/${id}`);
    }
};
