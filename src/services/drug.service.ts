import { apiClient } from "@/lib/api";

export interface DrugCatalogItem {
  id: string;
  name: string;
  ndc?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  unit?: string | null;
  source?: Record<string, unknown> | null;
  isActive: boolean;
}

export const drugService = {
  /** Tìm thuốc trong danh mục Dược thư quốc gia (GET /drugs/search, công khai). */
  async searchDrugs(
    query: string,
    limit = 10,
  ): Promise<{ data: DrugCatalogItem[]; meta: { total: number } }> {
    const res = await apiClient.get("/drugs/search", {
      params: { query, limit },
    });
    return res.data;
  },

  async getDrug(id: string): Promise<DrugCatalogItem> {
    const res = await apiClient.get(`/drugs/${id}`);
    return res.data;
  },
};
