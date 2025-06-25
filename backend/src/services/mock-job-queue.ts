/**
 * Mock Job Queue Service
 * Simulates a job queue system like BullMQ or Agenda for background processing
 * Handles asynchronous trading tasks that would typically run in worker processes
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Job status types
 */
export type JobStatus = 
  | 'waiting'
  | 'active' 
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

/**
 * Job priority levels
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Job types for trading system
 */
export type JobType = 
  | 'generate_signal'
  | 'technical_analysis'
  | 'sentiment_analysis'
  | 'risk_assessment'
  | 'send_alert'
  | 'update_market_data'
  | 'cleanup_data'
  | 'portfolio_analysis'
  | 'batch_processing'
  | 'data_export'
  | 'notification_delivery';

/**
 * Job configuration
 */
export interface JobConfig {
  id: string;
  type: JobType;
  data: any;
  priority: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  repeat?: {
    every?: number;
    cron?: string;
  };
  timeout?: number;
  removeOnComplete?: number;
  removeOnFail?: number;
}

/**
 * Job result
 */
export interface JobResult {
  id: string;
  type: JobType;
  status: JobStatus;
  data: any;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  duration?: number;
  attempts: number;
  progress?: number;
  logs: string[];
}

/**
 * Queue statistics
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
}

/**
 * Worker function type
 */
export type WorkerFunction = (job: JobResult) => Promise<any>;

/**
 * Mock Job Queue Class
 */
export class MockJobQueue extends EventEmitter {
  private jobs: Map<string, JobResult> = new Map();
  private workers: Map<JobType, WorkerFunction> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private concurrency: number = 3;
  private activeJobs: Set<string> = new Set();

  constructor(
    private queueName: string = 'trading-queue',
    options: {
      concurrency?: number;
      defaultJobOptions?: Partial<JobConfig>;
    } = {}
  ) {
    super();
    this.concurrency = options.concurrency || 3;
    
    console.log(`🔄 Mock Job Queue "${queueName}" initialized with concurrency: ${this.concurrency}`);
  }

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isProcessing) {
      console.log('⚠️ Job queue is already processing');
      return;
    }

    console.log(`🚀 Starting job queue processing...`);
    this.isProcessing = true;

    // Process jobs every 1 second
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 1000);

    this.emit('queue:started');
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    if (!this.isProcessing) {
      console.log('⚠️ Job queue is not processing');
      return;
    }

    console.log('⏹️ Stopping job queue processing...');
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs to complete...`);
    }

    this.emit('queue:stopped');
  }

  /**
   * Add a job to the queue
   */
  async add(type: JobType, data: any, options: Partial<JobConfig> = {}): Promise<string> {
    const jobId = options.id || uuidv4();
    const now = new Date();

    const job: JobResult = {
      id: jobId,
      type,
      status: options.delay ? 'delayed' : 'waiting',
      data,
      createdAt: now,
      attempts: 0,
      logs: []
    };

    this.jobs.set(jobId, job);

    // Handle delayed jobs
    if (options.delay) {
      setTimeout(() => {
        const delayedJob = this.jobs.get(jobId);
        if (delayedJob && delayedJob.status === 'delayed') {
          delayedJob.status = 'waiting';
          this.emit('job:delayed-to-waiting', delayedJob);
        }
      }, options.delay);
    }

    console.log(`📥 Job added to queue: ${type} (${jobId})`);
    this.emit('job:added', job);

    return jobId;
  }

  /**
   * Register a worker function for a job type
   */
  process(type: JobType, workerFunction: WorkerFunction): void {
    this.workers.set(type, workerFunction);
    console.log(`👷 Worker registered for job type: ${type}`);
  }

  /**
   * Process waiting jobs
   */
  private async processJobs(): Promise<void> {
    if (this.activeJobs.size >= this.concurrency) {
      return; // Already at max concurrency
    }

    // Get waiting jobs sorted by priority and creation time
    const waitingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'waiting')
      .sort((a, b) => {
        // Priority order: critical > high > normal > low
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder.normal; // Default priority
        const bPriority = priorityOrder.normal;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // If same priority, process older jobs first
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    // Process jobs up to concurrency limit
    const jobsToProcess = waitingJobs.slice(0, this.concurrency - this.activeJobs.size);

    for (const job of jobsToProcess) {
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: JobResult): Promise<void> {
    const worker = this.workers.get(job.type);
    if (!worker) {
      job.status = 'failed';
      job.error = `No worker registered for job type: ${job.type}`;
      job.failedAt = new Date();
      console.error(`❌ ${job.error} (${job.id})`);
      this.emit('job:failed', job);
      return;
    }

    // Mark job as active
    job.status = 'active';
    job.startedAt = new Date();
    job.attempts++;
    this.activeJobs.add(job.id);

    console.log(`⚡ Processing job: ${job.type} (${job.id}) - Attempt ${job.attempts}`);
    this.emit('job:active', job);

    try {
      // Execute the worker function
      const result = await worker(job);

      // Job completed successfully
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt!.getTime();

      console.log(`✅ Job completed: ${job.type} (${job.id}) in ${job.duration}ms`);
      this.emit('job:completed', job);

    } catch (error) {
      // Job failed
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.failedAt = new Date();
      job.duration = new Date().getTime() - job.startedAt!.getTime();

      console.error(`❌ Job failed: ${job.type} (${job.id}) - ${job.error}`);
      this.emit('job:failed', job);

      // TODO: Implement retry logic with backoff
    } finally {
      // Remove from active jobs
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): JobResult | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get jobs by status
   */
  getJobs(status?: JobStatus): JobResult[] {
    const allJobs = Array.from(this.jobs.values());
    return status ? allJobs.filter(job => job.status === status) : allJobs;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const jobs = Array.from(this.jobs.values());
    
    return {
      waiting: jobs.filter(j => j.status === 'waiting').length,
      active: jobs.filter(j => j.status === 'active').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      delayed: jobs.filter(j => j.status === 'delayed').length,
      paused: jobs.filter(j => j.status === 'paused').length,
      total: jobs.length
    };
  }

  /**
   * Remove completed jobs older than specified time
   */
  clean(maxAge: number = 24 * 60 * 60 * 1000): number { // Default: 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    let removedCount = 0;

    for (const [jobId, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt < cutoff
      ) {
        this.jobs.delete(jobId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old jobs from queue`);
    }

    return removedCount;
  }

  /**
   * Pause job processing
   */
  pause(): void {
    this.stop();
    console.log('⏸️ Job queue paused');
    this.emit('queue:paused');
  }

  /**
   * Resume job processing
   */
  resume(): void {
    this.start();
    console.log('▶️ Job queue resumed');
    this.emit('queue:resumed');
  }

  /**
   * Clear all jobs
   */
  clear(): void {
    const jobCount = this.jobs.size;
    this.jobs.clear();
    this.activeJobs.clear();
    console.log(`🗑️ Cleared ${jobCount} jobs from queue`);
    this.emit('queue:cleared');
  }

  /**
   * Remove specific job
   */
  remove(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status !== 'active') {
      this.jobs.delete(jobId);
      console.log(`🗑️ Removed job: ${job.type} (${jobId})`);
      this.emit('job:removed', job);
      return true;
    }
    return false;
  }

  /**
   * Retry a failed job
   */
  async retry(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'failed') {
      job.status = 'waiting';
      job.error = undefined;
      job.failedAt = undefined;
      console.log(`🔄 Retrying job: ${job.type} (${jobId})`);
      this.emit('job:retrying', job);
      return true;
    }
    return false;
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'active') {
      job.progress = Math.max(0, Math.min(100, progress));
      this.emit('job:progress', job);
    }
  }

  /**
   * Add log entry to job
   */
  log(jobId: string, message: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.logs.push(`[${new Date().toISOString()}] ${message}`);
      this.emit('job:log', job, message);
    }
  }
}

/**
 * Trading-specific job queue with pre-configured workers
 */
export class TradingJobQueue extends MockJobQueue {
  constructor() {
    super('trading-queue', { concurrency: 5 });
    this.setupTradingWorkers();
  }

  /**
   * Setup workers for trading-specific jobs
   */
  private setupTradingWorkers(): void {
    // Signal generation worker
    this.process('generate_signal', async (job) => {
      const { ticker } = job.data;
      this.log(job.id, `Generating signal for ${ticker}`);
      
      // Simulate signal generation work
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.updateProgress(job.id, 50);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.updateProgress(job.id, 100);
      
      return {
        ticker,
        action: 'BUY',
        confidence: 0.85,
        generatedAt: new Date()
      };
    });

    // Technical analysis worker
    this.process('technical_analysis', async (job) => {
      const { ticker } = job.data;
      this.log(job.id, `Running technical analysis for ${ticker}`);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.updateProgress(job.id, 70);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      this.updateProgress(job.id, 100);
      
      return {
        ticker,
        rsi: 65.5,
        macd: 'BULLISH',
        movingAverages: 'BUY',
        analyzedAt: new Date()
      };
    });

    // Sentiment analysis worker
    this.process('sentiment_analysis', async (job) => {
      const { ticker } = job.data;
      this.log(job.id, `Analyzing sentiment for ${ticker}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateProgress(job.id, 100);
      
      return {
        ticker,
        sentimentScore: 0.7,
        newsImpact: 'POSITIVE',
        analyzedAt: new Date()
      };
    });

    // Alert sending worker
    this.process('send_alert', async (job) => {
      const { alertId, recipients } = job.data;
      this.log(job.id, `Sending alert ${alertId} to ${recipients.length} recipients`);
      
      // Simulate sending notifications
      for (let i = 0; i < recipients.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.updateProgress(job.id, ((i + 1) / recipients.length) * 100);
      }
      
      return {
        alertId,
        recipientCount: recipients.length,
        sentAt: new Date()
      };
    });

    // Market data update worker
    this.process('update_market_data', async (job) => {
      const { tickers } = job.data;
      this.log(job.id, `Updating market data for ${tickers.length} tickers`);
      
      const results = [];
      for (let i = 0; i < tickers.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        results.push({
          ticker: tickers[i],
          price: 100 + Math.random() * 400,
          volume: Math.floor(Math.random() * 1000000)
        });
        this.updateProgress(job.id, ((i + 1) / tickers.length) * 100);
      }
      
      return {
        updatedTickers: tickers.length,
        results,
        updatedAt: new Date()
      };
    });

    // Data cleanup worker
    this.process('cleanup_data', async (job) => {
      const { tables, maxAge } = job.data;
      this.log(job.id, `Cleaning up data older than ${maxAge} days`);
      
      let totalCleaned = 0;
      for (let i = 0; i < tables.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const cleaned = Math.floor(Math.random() * 100);
        totalCleaned += cleaned;
        this.updateProgress(job.id, ((i + 1) / tables.length) * 100);
      }
      
      return {
        tablesProcessed: tables.length,
        recordsCleaned: totalCleaned,
        cleanedAt: new Date()
      };
    });

    console.log('✅ Trading job workers configured');
  }

  /**
   * Add signal generation job
   */
  async addSignalGenerationJob(ticker: string, priority: JobPriority = 'normal'): Promise<string> {
    return await this.add('generate_signal', { ticker }, { priority });
  }

  /**
   * Add technical analysis job
   */
  async addTechnicalAnalysisJob(ticker: string, priority: JobPriority = 'normal'): Promise<string> {
    return await this.add('technical_analysis', { ticker }, { priority });
  }

  /**
   * Add sentiment analysis job
   */
  async addSentimentAnalysisJob(ticker: string, priority: JobPriority = 'normal'): Promise<string> {
    return await this.add('sentiment_analysis', { ticker }, { priority });
  }

  /**
   * Add alert sending job
   */
  async addAlertJob(alertId: string, recipients: string[], priority: JobPriority = 'high'): Promise<string> {
    return await this.add('send_alert', { alertId, recipients }, { priority });
  }

  /**
   * Add market data update job
   */
  async addMarketDataUpdateJob(tickers: string[], priority: JobPriority = 'normal'): Promise<string> {
    return await this.add('update_market_data', { tickers }, { priority });
  }

  /**
   * Add data cleanup job
   */
  async addCleanupJob(tables: string[], maxAge: number = 30, priority: JobPriority = 'low'): Promise<string> {
    return await this.add('cleanup_data', { tables, maxAge }, { priority });
  }

  /**
   * Add batch processing job
   */
  async addBatchJob(operation: string, items: any[], priority: JobPriority = 'normal'): Promise<string> {
    return await this.add('batch_processing', { operation, items }, { priority });
  }
}

/**
 * Singleton instance for global use
 */
export const tradingJobQueue = new TradingJobQueue();

/**
 * Factory function
 */
export function createTradingJobQueue(): TradingJobQueue {
  return new TradingJobQueue();
}

/**
 * Simple job queue for basic operations
 */
export function createSimpleJobQueue(name: string = 'simple-queue'): MockJobQueue {
  return new MockJobQueue(name);
}

export default MockJobQueue;