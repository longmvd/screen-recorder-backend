export interface IStorageService {
  /**
   * Save a file to storage
   * @param sourcePath - Path to the source file
   * @param destinationKey - Storage key/path
   * @returns Download URL
   */
  save(sourcePath: string, destinationKey: string): Promise<string>;

  /**
   * Get download URL for a file
   * @param key - Storage key/path
   * @returns Download URL
   */
  getDownloadUrl(key: string): Promise<string>;

  /**
   * Check if a file exists
   * @param key - Storage key/path
   * @returns True if exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Delete a file
   * @param key - Storage key/path
   */
  delete(key: string): Promise<void>;

  /**
   * Get file stream for downloading
   * @param key - Storage key/path
   * @returns File path or stream
   */
  getFilePath(key: string): Promise<string>;
}
