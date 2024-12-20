import nock from "nock";
import { request } from "undici";
import { HttpClient } from "../index";

// Mock the `undici` request function
jest.mock("undici", () => ({
  request: jest.fn(),
}));

describe("HttpClient", () => {
  const client = new HttpClient({
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 1,
      timeout: 5000, // 5 seconds
    },
    retryCount: 2,
    retryDelay: 1000, // 1 second
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("should make a successful GET request", async () => {
    const mockResponse = {
      statusCode: 200,
      body: {
        json: jest.fn().mockResolvedValue({ id: 1, title: "Test" }),
      },
    };

    (request as jest.Mock).mockResolvedValue(mockResponse);

    const response = await client.request(
      "https://jsonplaceholder.typicode.com/posts/1",
      { method: "GET" },
    );

    expect(response).toEqual({ id: 1, title: "Test" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("should retry failed requests before failing", async () => {
    const error = new Error("Temporary failure");
    const mockResponse = {
      statusCode: 200,
      body: {
        json: jest.fn().mockResolvedValue({ success: true }),
      },
    };

    (request as jest.Mock)
      .mockRejectedValueOnce(error) // First attempt failed
      .mockRejectedValueOnce(error) // Second attempt failed
      .mockResolvedValueOnce(mockResponse); // Third attempt successful

    const response = await client.request(
      "https://jsonplaceholder.typicode.com/posts/1",
      { method: "GET" },
    );

    expect(response).toEqual({ success: true });
    expect(request).toHaveBeenCalledTimes(3); // Two failures and one success
  });

  it("should fail after exceeding failureThreshold", async () => {
    const error = new Error("Network error");
    (request as jest.Mock).mockRejectedValue(error);

    // Failures should trigger the Circuit Breaker
    await client
      .request("http://example.com", { method: "GET" })
      .catch(() => {});
    await client
      .request("http://example.com", { method: "GET" })
      .catch(() => {});
    await client
      .request("http://example.com", { method: "GET" })
      .catch(() => {});

    // The Circuit Breaker should be open
    await expect(
      client.request("http://example.com", { method: "GET" }),
    ).rejects.toThrow("Circuit breaker is OPEN");
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("should reset after timeout when in OPEN state", async () => {
    jest.useFakeTimers();

    const error = new Error("Network error");
    const successResponse = {
      statusCode: 200,
      body: {
        json: jest.fn().mockResolvedValue({ success: true }),
      },
    };
    const mockRequest = request as jest.Mock;

    // Set up the mock to simulate failure for the first 3 requests
    mockRequest
      .mockRejectedValueOnce(error) // First failure
      .mockRejectedValueOnce(error) // Second failure
      .mockRejectedValueOnce(error) // Third failure
      .mockResolvedValueOnce(successResponse); // Success after timeout

    console.log("Making first failed request");
    // Simulate 3 failed requests to trigger the circuit breaker to open
    await expect(
      client.request("http://example.com", { method: "GET" }),
    ).rejects.toThrow("Circuit breaker is OPEN");
    console.log("Making second failed request");
    await expect(
      client.request("http://example.com", { method: "GET" }),
    ).rejects.toThrow("Circuit breaker is OPEN");
    console.log("Making third failed request");
    await expect(
      client.request("http://example.com", { method: "GET" }),
    ).rejects.toThrow("Circuit breaker is OPEN");

    // Assert that the request was called 3 times during the failures
    expect(mockRequest).toHaveBeenCalledTimes(3);

    // Simulate timeout reset after 5000ms
    console.log("Advancing timers by 5000ms");
    jest.advanceTimersByTime(5000); // Simulate timeout

    // Resolve any pending promises to allow state transition
    await Promise.resolve();

    console.log("Attempting successful request after timeout reset");
    // Now simulate a successful request after the circuit breaker resets
    const response = await client.request("http://example.com", {
      method: "GET",
    });

    expect(response).toEqual({ success: true });
    expect(mockRequest).toHaveBeenCalledTimes(4); // Expect 3 failures and 1 success
  }, 10000); // Increase timeout for this test
});
