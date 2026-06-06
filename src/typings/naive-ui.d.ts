declare namespace NaiveUI {
  type ThemeColor = 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning';
  type Align = 'stretch' | 'baseline' | 'start' | 'end' | 'center' | 'flex-end' | 'flex-start';

  type DataTableBaseColumn<T> = import('naive-ui').DataTableBaseColumn<T>;
  type DataTableExpandColumn<T> = import('naive-ui').DataTableExpandColumn<T>;
  type DataTableSelectionColumn<T> = import('naive-ui').DataTableSelectionColumn<T>;
  type TableColumnGroup<T> = import('naive-ui/es/data-table/src/interface').TableColumnGroup<T>;
  type TableColumnCheck = import('@sa/hooks').TableColumnCheck;

  type SetTableColumnKey<C, T> = Omit<C, 'key'> & { key: keyof T | (string & {}) };
  type LegacyTableData = Api.Common.LegacyCommonRecord<object>;

  type TableColumnWithKey<T> = SetTableColumnKey<DataTableBaseColumn<T>, T> | SetTableColumnKey<TableColumnGroup<T>, T>;

  type TableColumn<T> = TableColumnWithKey<T> | DataTableSelectionColumn<T> | DataTableExpandColumn<T>;

  /**
   * the type of table operation
   *
   * - add: add table item
   * - edit: edit table item
   */
  type TableOperateType = 'add' | 'edit';

  /**
   * 兼容V1代码
   */
  type TableDataWithIndex<T> = import('@sa/hooks').TableDataWithIndex<T>;
  type FlatResponseData<T> = import('@sa/axios').FlatResponseData<any, T>;

  type TableApiFn<T = any, R = Api.Common.CommonSearchParams> = (
    params: R,
    signal?: AbortSignal
  ) => Promise<FlatResponseData<Api.Common.PaginatingQueryRecord<T>>>;

  // type GetTableData<A extends TableApiFn> = A extends TableApiFn<infer T> ? T : never;

  type GetApiData<A extends (...args: any[]) => any> =
    Awaited<ReturnType<A>> extends FlatResponseData<infer D> ? D : never;

  type GetTableData<A extends (...args: any[]) => any> =
    GetApiData<A> extends Api.Common.PaginatingQueryRecord<infer T> ? T : never;

  type NaiveTableConfig<A extends TableApiFn> = Pick<
    import('@sa/hooks').TableConfig<A, GetTableData<A>, TableColumn<TableDataWithIndex<GetTableData<A>>>>,
    'apiFn' | 'apiParams' | 'columns' | 'immediate'
  > & {
    /**
     * whether to display the total items count
     *
     * @default false
     */
    showTotal?: boolean;
  };
}
