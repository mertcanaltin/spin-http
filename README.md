# Spin-HTTP: High-Performance HTTP Client with Circuit Breaking and Retry Mechanisms

Spin-HTTP is a lightweight, high-performance HTTP client built on top of [Undici](https://github.com/nodejs/undici). It provides advanced features like circuit breaking and retry mechanisms to ensure reliability and fault tolerance in your applications.

---

## Features

- **Powered by Undici**:
  - Utilizes Node.js's modern and efficient HTTP client for fast and lightweight request handling.

- **Circuit Breaking**:
  - Opens the circuit after a configurable number of failures.
  - Automatically transitions to a `HALF_OPEN` state to test recovery.
  - Closes the circuit upon successful recovery, resuming normal operations.

- **Retry Mechanism**:
  - Retries failed requests up to a configurable number of attempts.
  - Configurable delays between retries to reduce server load and improve reliability.

- **TypeScript Support**:
  - Fully typed API ensures ease of integration and type safety in your projects.

---

## Installation

Install the package via `npm` or `yarn`:

```bash
npm install spin-http
# or
yarn add spin-http
```

---

## Usage

### Example

```typescript
import { HttpClient } from 'spin-http';

const client = new HttpClient({
    circuitBreaker: {
        failureThreshold: 5,        // Trigger OPEN state after 5 consecutive failures
        successThreshold: 2,       // Switch to CLOSED state after 2 consecutive successes
        timeout: 10000,            // Stay in OPEN state for 10 seconds
    },
    retryCount: 3,                  // Retry up to 3 times
    retryDelay: 1000,               // Wait 1 second between retries
});

(async () => {
    try {
        const response = await client.request('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'GET',
        });
        console.log('Response:', response);
    } catch (error) {
        console.error('Request failed:', error.message);
    }
})();
```

---

## Configuration Options

### Circuit Breaker

| Option              | Type   | Description                                              |
|---------------------|--------|----------------------------------------------------------|
| `failureThreshold`  | Number | Number of consecutive failures to trigger circuit open.  |
| `successThreshold`  | Number | Number of consecutive successes to close the circuit.    |
| `timeout`           | Number | Time in milliseconds to stay in the open state.          |

### Retry Mechanism

| Option       | Type   | Description                                            |
|--------------|--------|--------------------------------------------------------|
| `retryCount` | Number | Number of retries before failing the request.          |
| `retryDelay` | Number | Time in milliseconds to wait between retry attempts.   |

---

## Why Spin-HTTP?

1. **High Performance**: Built on top of Undici, providing one of the fastest HTTP clients for Node.js.
2. **Fault Tolerance**: Circuit-breaking mechanisms prevent system overload during high failure conditions.
3. **Flexibility**: Configurable retries and TypeScript support make it easy to customize and integrate.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

Feel free to contribute or submit issues if you encounter any problems. Happy coding! 🚀
