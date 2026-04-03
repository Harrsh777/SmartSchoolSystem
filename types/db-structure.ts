/**
 * Public schema introspection payload for the Database Structure viewer.
 */

export interface DbColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface DbRelation {
  column: string;
  /** Target table.column */
  references: string;
  foreignTable: string;
  foreignColumn: string;
}

export interface DbTable {
  name: string;
  columns: DbColumn[];
  relations: DbRelation[];
}

export interface DbStructureResponse {
  tables: DbTable[];
  meta: {
    fetchedAt: string;
    tableCount: number;
    edgeCount: number;
  };
}
