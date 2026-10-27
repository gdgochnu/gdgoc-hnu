/**
 * Fetches all rows from a Supabase PostgREST query by automatically paginating
 * across the default 1000-row server-side limit (`db_max_rows`).
 *
 * @param queryBuilder A function that receives `from` and `to` indices and returns a PostgREST query with `.range(from, to)`.
 * @returns An array containing all matching rows.
 */
export async function fetchAllSupabaseRows<T = any>(
  queryBuilder: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: T[] = [];

  while (true) {
    const { data, error } = await queryBuilder(from, from + pageSize - 1);
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }
    allRows.push(...data);
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return allRows;
}
