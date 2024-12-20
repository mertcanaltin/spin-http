// Import necessary modules from Undici and other libraries
import { type Dispatcher, request } from "undici";
import { URL } from "whatwg-url";

// Define circuit breaker states
type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures to trigger OPEN state
  successThreshold: number; // Number of successes to switch from HALF_OPEN to CLOSED
  timeout: number; // Time in milliseconds to stay in OPEN state before switching to HALF_OPEN
}

class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(private options: CircuitBreakerOptions) {}

  public canRequest(): boolean {
    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime > this.options.timeout) {
        this.state = "HALF_OPEN";
      } else {
        return false;
      }
    }
    return true;
  }

  public onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = "CLOSED";
        this.reset();
      }
    } else if (this.state === "CLOSED") {
      this.reset();
    }
  }

  public onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (
      this.state === "HALF_OPEN" ||
      (this.state === "CLOSED" &&
        this.failureCount >= this.options.failureThreshold)
    ) {
      this.state = "OPEN";
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }
}

interface HttpClientOptions {
  circuitBreaker: CircuitBreakerOptions;
  retryCount: number;
  retryDelay: number; // Time in milliseconds between retries
}

class HttpClient {
  private circuitBreaker: CircuitBreaker;

  constructor(private options: HttpClientOptions) {
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
  }

  public async request(
    url: string,
    options?: Partial<Dispatcher.RequestOptions>,
  ): Promise<any> {
    let attempts = 0;

    while (attempts <= this.options.retryCount) {
      if (!this.circuitBreaker.canRequest()) {
        throw new Error("Circuit breaker is OPEN");
      }

      try {
        const parsedUrl = new URL(url);
        const finalOptions = {
          ...options,
          origin: `${parsedUrl.protocol}//${parsedUrl.host}`,
          path: parsedUrl.pathname + (parsedUrl.search || ""),
          method: options?.method || "GET",
        };

        const response = await request(finalOptions);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          this.circuitBreaker.onSuccess();
          return response.body.json();
        }
        throw new Error(`HTTP Error: ${response.statusCode}`);
      } catch (error) {
        attempts++;
        this.circuitBreaker.onFailure();

        if (attempts > this.options.retryCount) {
          throw error;
        }

        await this.delay(this.options.retryDelay);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { CircuitBreaker, HttpClient, type HttpClientOptions };
