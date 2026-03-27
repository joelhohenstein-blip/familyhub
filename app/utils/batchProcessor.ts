/**
 * Batch Processing Utilities
 * 
 * High-performance batch processing for image compression with:
 * - Parallel worker pool management
 * - Progress tracking
 * - Error handling and recovery
 * - Memory management
 * - Performance metrics
 * 
 * @module utils/batchProcessor
 */

import type {
  CompressionResult,
  BatchCompressionReport,
  CompressionProfileName,
  ImageFormat,
} from '~/types/compression';

/**
 * Batch processor configuration
 */
export interface BatchProcessorConfig {
  /** Number of parallel workers */
  workers: number;

  /** Maximum retries per item */
  maxRetries: number;

  /** Timeout per item in milliseconds */
  timeout: number;

  /** Enable progress tracking */
  trackProgress: boolean;

  /** Progress callback interval in milliseconds */
  progressInterval: number;

  /** Memory limit in MB */
  memoryLimit: number;

  /** Enable memory monitoring */
  monitorMemory: boolean;
}

/**
 * Default batch processor configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchProcessorConfig = {
  workers: 4,
  maxRetries: 3,
  timeout: 30000,
  trackProgress: true,
  progressInterval: 1000,
  memoryLimit: 512,
  monitorMemory: true,
};

/**
 * Batch processing progress
 */
export interface BatchProgress {
  /** Total items to process */
  total: number;

  /** Items processed */
  processed: number;

  /** Items succeeded */
  succeeded: number;

  /** Items failed */
  failed: number;

  /** Current progress percentage */
  percentage: number;

  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number;

  /** Current memory usage in MB */
  memoryUsage: number;

  /** Processing rate (items/second) */
  processingRate: number;
}

/**
 * Batch processing metrics
 */
export interface BatchMetrics {
  /** Total processing time in milliseconds */
  totalTime: number;

  /** Average time per item in milliseconds */
  averageTime: number;

  /** Minimum time per item in milliseconds */
  minTime: number;

  /** Maximum time per item in milliseconds */
  maxTime: number;

  /** Peak memory usage in MB */
  peakMemory: number;

  /** Average memory usage in MB */
  averageMemory: number;

  /** Success rate percentage */
  successRate: number;

  /** Processing rate (items/second) */
  processingRate: number;

  /** Throughput (MB/second) */
  throughput: number;
}

/**
 * Worker task
 */
interface WorkerTask<T, R> {
  id: string;
  input: T;
  retries: number;
  startTime: number;
  resolve: (value: R) => void;
  reject: (reason?: any) => void;
}

/**
 * Batch processor state
 */
interface BatchProcessorState<T, R> {
  config: BatchProcessorConfig;
  queue: WorkerTask<T, R>[];
  active: Map<string, WorkerTask<T, R>>;
  results: Map<string, R>;
  errors: Map<string, Error>;
  metrics: {
    startTime: number;
    endTime: number;
    totalTime: number;
    itemTimes: number[];
    memoryReadings: number[];
  };
  progress: BatchProgress;
}

/**
 * Generic batch processor
 */
export class BatchProcessor<T, R> {
  private state: BatchProcessorState<T, R>;
  private worker: (item: T) => Promise<R>;
  private progressCallback?: (progress: BatchProgress) => void;
  private progressInterval?: NodeJS.Timeout;

  constructor(
    worker: (item: T) => Promise<R>,
    config: Partial<BatchProcessorConfig> = {}
  ) {
    this.worker = worker;
    this.state = {
      config: { ...DEFAULT_BATCH_CONFIG, ...config },
      queue: [],
      active: new Map(),
      results: new Map(),
      errors: new Map(),
      metrics: {
        startTime: 0,
        endTime: 0,
        totalTime: 0,
        itemTimes: [],
        memoryReadings: [],
      },
      progress: {
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
        memoryUsage: 0,
        processingRate: 0,
      },
    };
  }

  /**
   * Process batch of items
   */
  async process(
    items: T[],
    onProgress?: (progress: BatchProgress) => void
  ): Promise<{ results: R[]; errors: Array<{ item: T; error: Error }> }> {
    this.progressCallback = onProgress;
    this.state.queue = items.map((item, index) => ({
      id: `task-${index}`,
      input: item,
      retries: 0,
      startTime: 0,
      resolve: () => {},
      reject: () => {},
    }));

    this.state.progress.total = items.length;
    this.state.metrics.startTime = Date.now();

    // Start progress tracking
    if (this.state.config.trackProgress) {
      this.startProgressTracking();
    }

    // Process queue with workers
    const promises = this.state.queue.map((task) => this.processTask(task));
    await Promise.all(promises);

    this.state.metrics.endTime = Date.now();
    this.state.metrics.totalTime = this.state.metrics.endTime - this.state.metrics.startTime;

    // Stop progress tracking
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // Collect results
    const results: R[] = [];
    const errors: Array<{ item: T; error: Error }> = [];

    for (let i = 0; i < items.length; i++) {
      const taskId = `task-${i}`;
      if (this.state.results.has(taskId)) {
        results.push(this.state.results.get(taskId)!);
      } else if (this.state.errors.has(taskId)) {
        errors.push({
          item: items[i],
          error: this.state.errors.get(taskId)!,
        });
      }
    }

    return { results, errors };
  }

  /**
   * Process a single task
   */
  private async processTask(task: WorkerTask<T, R>): Promise<void> {
    // Wait for available worker slot
    while (this.state.active.size >= this.state.config.workers) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.state.active.set(task.id, task);
    task.startTime = Date.now();

    try {
      const result = await Promise.race([
        this.worker(task.input),
        this.createTimeout(this.state.config.timeout),
      ]);

      this.state.results.set(task.id, result);
      this.state.progress.succeeded++;

      const itemTime = Date.now() - task.startTime;
      this.state.metrics.itemTimes.push(itemTime);
    } catch (error) {
      if (task.retries < this.state.config.maxRetries) {
        task.retries++;
        this.state.active.delete(task.id);
        await this.processTask(task);
      } else {
        this.state.errors.set(
          task.id,
          error instanceof Error ? error : new Error(String(error))
        );
        this.state.progress.failed++;
      }
    } finally {
      this.state.active.delete(task.id);
      this.state.progress.processed++;
      this.updateProgress();
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Task timeout after ${ms}ms`)), ms)
    );
  }

  /**
   * Start progress tracking
   */
  private startProgressTracking(): void {
    this.progressInterval = setInterval(() => {
      this.updateProgress();
      if (this.progressCallback) {
        this.progressCallback(this.state.progress);
      }
    }, this.state.config.progressInterval);
  }

  /**
   * Update progress
   */
  private updateProgress(): void {
    const { total, processed, succeeded } = this.state.progress;

    this.state.progress.percentage = total > 0 ? (processed / total) * 100 : 0;

    // Calculate processing rate
    const elapsed = Date.now() - this.state.metrics.startTime;
    this.state.progress.processingRate =
      elapsed > 0 ? (processed / elapsed) * 1000 : 0;

    // Estimate time remaining
    const remaining = total - processed;
    this.state.progress.estimatedTimeRemaining =
      this.state.progress.processingRate > 0
        ? (remaining / this.state.progress.processingRate) * 1000
        : 0;

    // Monitor memory
    if (this.state.config.monitorMemory) {
      const memUsage = this.getMemoryUsage();
      this.state.progress.memoryUsage = memUsage;
      this.state.metrics.memoryReadings.push(memUsage);
    }
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
    }
    return 0;
  }

  /**
   * Get batch metrics
   */
  getMetrics(): BatchMetrics {
    const { itemTimes, memoryReadings, totalTime } = this.state.metrics;
    const { total, succeeded, failed } = this.state.progress;

    const avgTime = itemTimes.length > 0
      ? itemTimes.reduce((a, b) => a + b, 0) / itemTimes.length
      : 0;

    const minTime = itemTimes.length > 0 ? Math.min(...itemTimes) : 0;
    const maxTime = itemTimes.length > 0 ? Math.max(...itemTimes) : 0;

    const peakMemory = memoryReadings.length > 0
      ? Math.max(...memoryReadings)
      : 0;

    const avgMemory = memoryReadings.length > 0
      ? memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length
      : 0;

    const successRate = total > 0 ? (succeeded / total) * 100 : 0;
    const processingRate = totalTime > 0 ? (total / totalTime) * 1000 : 0;

    return {
      totalTime,
      averageTime: avgTime,
      minTime,
      maxTime,
      peakMemory,
      averageMemory: avgMemory,
      successRate,
      processingRate,
      throughput: 0, // Would need file size data
    };
  }

  /**
   * Get current progress
   */
  getProgress(): BatchProgress {
    return { ...this.state.progress };
  }

  /**
   * Cancel processing
   */
  cancel(): void {
    this.state.queue = [];
    this.state.active.clear();
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }
}

/**
 * Compression batch processor
 */
export class CompressionBatchProcessor {
  private processor: BatchProcessor<
    { input: string; output: string; profile: CompressionProfileName },
    CompressionResult
  >;

  constructor(
    compressionFn: (
      input: string,
      output: string,
      profile: CompressionProfileName
    ) => Promise<CompressionResult>,
    config?: Partial<BatchProcessorConfig>
  ) {
    this.processor = new BatchProcessor(
      async (task) => {
        return compressionFn(task.input, task.output, task.profile);
      },
      config
    );
  }

  /**
   * Process batch of images
   */
  async processBatch(
    items: Array<{
      input: string;
      output: string;
      profile: CompressionProfileName;
    }>,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchCompressionReport> {
    const { results, errors } = await this.processor.process(items, onProgress);

    const metrics = this.processor.getMetrics();
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);

    return {
      totalImages: items.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: errors.length,
      totalOriginalSize,
      totalCompressedSize,
      overallRatio: totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0,
      overallSavings:
        totalOriginalSize > 0
          ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
          : 0,
      totalTime: metrics.totalTime,
      averageTimePerImage: metrics.averageTime,
      results,
      errors: errors.map((e) => ({
        file: e.item.input,
        error: e.error.message,
      })),
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): BatchMetrics {
    return this.processor.getMetrics();
  }

  /**
   * Get progress
   */
  getProgress(): BatchProgress {
    return this.processor.getProgress();
  }

  /**
   * Cancel processing
   */
  cancel(): void {
    this.processor.cancel();
  }
}

/**
 * Chunk array into batches
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process array in parallel batches
 */
export async function processBatchesInParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  parallelBatches: number = 2
): Promise<R[]> {
  const batches = chunkArray(items, batchSize);
  const results: R[] = [];

  for (let i = 0; i < batches.length; i += parallelBatches) {
    const parallelBatches_ = batches.slice(i, i + parallelBatches);
    const batchResults = await Promise.all(
      parallelBatches_.map((batch) =>
        Promise.all(batch.map((item) => processor(item)))
      )
    );
    results.push(...batchResults.flat());
  }

  return results;
}

/**
 * Create progress bar string
 */
export function createProgressBar(
  progress: BatchProgress,
  width: number = 40
): string {
  const filled = Math.round((progress.percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentage = progress.percentage.toFixed(1);
  const rate = progress.processingRate.toFixed(1);
  const remaining = Math.round(progress.estimatedTimeRemaining / 1000);

  return `[${bar}] ${percentage}% | ${progress.processed}/${progress.total} | ${rate} items/s | ${remaining}s remaining`;
}

/**
 * Format batch metrics for display
 */
export function formatBatchMetrics(metrics: BatchMetrics): string {
  return `
Total Time: ${(metrics.totalTime / 1000).toFixed(2)}s
Average Time: ${metrics.averageTime.toFixed(0)}ms
Min/Max Time: ${metrics.minTime.toFixed(0)}ms / ${metrics.maxTime.toFixed(0)}ms
Success Rate: ${metrics.successRate.toFixed(1)}%
Processing Rate: ${metrics.processingRate.toFixed(2)} items/s
Peak Memory: ${metrics.peakMemory.toFixed(2)}MB
Average Memory: ${metrics.averageMemory.toFixed(2)}MB
  `.trim();
}
