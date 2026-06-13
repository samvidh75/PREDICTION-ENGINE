declare module 'sql.js' {
  interface SqlJsDatabase {
    run(sql: string, params?: unknown[]): SqlJsDatabase;
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
    prepare(sql: string): SqlJsStatement;
    close(): void;
    export(): Uint8Array;
    getRowsModified(): number;
  }

  interface SqlJsStatement {
    bind(params?: unknown[]): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    get(): unknown[];
    getColumnNames(): string[];
    free(): void;
    reset(): void;
    run(params?: unknown[]): void;
  }

  interface SqlJsModule {
    Database: new (data?: Uint8Array | number[]) => SqlJsDatabase;
    run: (sql: string, params?: unknown[]) => void;
  }

  interface SqlJsConfig {
    locateFile?: (file: string) => string;
    wasmBinary?: ArrayBuffer;
  }

  export { SqlJsModule, SqlJsDatabase, SqlJsStatement, SqlJsConfig };
  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsModule>;
}
