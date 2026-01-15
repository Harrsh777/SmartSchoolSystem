declare module 'archiver' {
  interface ArchiverOptions {
    zlib?: { level?: number };
    store?: boolean;
  }

  interface Archiver {
    append(source: string | Buffer, name: string): this;
    finalize(): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): this;
    pipe(destination: NodeJS.WritableStream): this;
  }

  function archiver(format: string, options?: ArchiverOptions): Archiver;
  export default archiver;
}
