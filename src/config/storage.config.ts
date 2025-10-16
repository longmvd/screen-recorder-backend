export interface StorageConfig {
  type: 'LOCAL' | 'MINIO';
  localPath: string;
  cleanupChunks: boolean;
  tempDir: string;
  minio?: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    bucket: string;
    useSSL: boolean;
  };
}

export const getStorageConfig = (): StorageConfig => {
  return {
    type: (process.env.STORAGE_TYPE as 'LOCAL' | 'MINIO') || 'LOCAL',
    localPath: process.env.STORAGE_LOCAL_PATH || '/recordings',
    cleanupChunks: process.env.CLEANUP_CHUNKS === 'true',
    tempDir: process.env.TEMP_DIR || '/tmp',
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'recordings',
      useSSL: process.env.MINIO_USE_SSL === 'true',
    },
  };
};
