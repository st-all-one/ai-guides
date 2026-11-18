# 11 - Async and Concurrency

This chapter answers which concurrency primitive fits a workload and how to structure startup, backpressure and shutdown. It assumes the runtime/GIL model in ch. 03 and the error model in ch. 09.

## Choose a model

| Workload | Preferred tool | Documented anchor |
|---|---|---|
| IO-bound, structured network code | asyncio coroutines + `TaskGroup` | asyncio suits IO-bound, high-level structured code (`samples/library__asyncio.rst:29`); `TaskGroup` recommended over `create_task`/`gather` (`samples/whatsnew__3.11.rst:578-583`) |
| CPU-bound pure Python | `multiprocessing` / `ProcessPoolExecutor` | the GIL admits one bytecode at a time (`samples/library__threading.rst:84-100`) |
| IO-bound with blocking libraries | `ThreadPoolExecutor` | threading remains appropriate for IO-bound tasks (`samples/library__threading.rst:89-92`) |
| Need true parallel threads | free-threaded build | available since 3.13, not default (`samples/library__threading.rst:104-106`) |

Community framing (`wiki, lower authority`): concurrency means multiple computations happening at once, and shared resources can cause race conditions (`samples/language__Concurrency.html:267`); async/await is described as simpler syntactic sugar for coroutines (`samples/language__Concurrency.html:294`).

## asyncio: coroutines, tasks, cancellation

Calling an `async def` function yields a coroutine; the library runs coroutines concurrently and gives full control over execution (`samples/library__asyncio.rst:39-46`). `asyncio.run` drives the top-level coroutine (`samples/library__asyncio.rst:14-20`).

`TaskGroup` is an async context manager holding a group of tasks and waiting for all of them on exit — recommended for new code over `create_task`/`gather` (`samples/whatsnew__3.11.rst:578-583`). `asyncio.timeout` is an async context manager for timeouts, recommended over `wait_for` (`samples/whatsnew__3.11.rst:585-588`). `Runner` exposes the machinery behind `asyncio.run` (`samples/whatsnew__3.11.rst:590-591`). Cancellation state is queryable via `Task.cancelling`/`uncancel` (`samples/whatsnew__3.11.rst:614-616`).

```python
import asyncio

async def worker(name):
    await asyncio.sleep(0.01)

async def main():
    async with asyncio.timeout(1):             # :585-588
        async with asyncio.TaskGroup() as tg:  # :578-583
            for name in ("a", "b", "c"):
                tg.create_task(worker(name))

asyncio.run(main())                            # :14-20
```

`derived`: prefer structured groups over detached tasks; a `TaskGroup` turns child failure into an `ExceptionGroup` when `all_errors` is used (`samples/whatsnew__3.11.rst:599`).

## Threads, the GIL and free-threading

In CPython only one thread can execute Python code at once (`samples/library__threading.rst:84-92`); for multicore CPU work the docs advise `multiprocessing` or `ProcessPoolExecutor` (`samples/library__threading.rst:98-100`). Threads still suit simultaneous IO-bound work (`samples/library__threading.rst:89-92`).

| Build | Execution model | Evidence |
|---|---|---|
| Standard CPython | one thread executes Python bytecode; GIL serialises CPU work | `samples/library__threading.rst:84-100` |
| Free-threaded 3.13 | GIL disabled, experimental, `python3.13t`, single-thread hit | `samples/whatsnew__3.13.rst:307-323` |
| Free-threaded 3.14 | officially supported (PEP 779); ~5-10% single-thread penalty | `samples/whatsnew__3.14.rst:134`,`:487-489` |

Free-threaded 3.13 also warns that software will not all benefit automatically and may show bugs (`samples/whatsnew__3.13.rst:321-323`). 3.14 enabled the specializing adaptive interpreter in free-threaded mode (`samples/whatsnew__3.14.rst:485-488`).

## Executors

`concurrent.futures` exposes one `Executor` interface over threads, interpreters or processes (`samples/library__concurrent.futures.rst:16-22`). `shutdown(wait=True, cancel_futures=False)` releases resources; `submit`/`map` after shutdown raise `RuntimeError` (`samples/library__concurrent.futures.rst:85-92`). All queued `ThreadPoolExecutor` threads are joined before interpreter exit, which is why long-running tasks are discouraged (`samples/library__concurrent.futures.rst:170-175`). `as_completed` yields futures as they finish (`samples/library__concurrent.futures.rst:674-684`); `Executor.map` accepts a `chunksize` (`samples/library__concurrent.futures.rst:49`,`:73-74`). `ProcessPoolExecutor` defaults to `os.process_cpu_count()` workers (`samples/library__concurrent.futures.rst:383`).

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

with ThreadPoolExecutor(max_workers=8) as ex:   # :16-22
    futures = [ex.submit(fetch, url) for url in urls]
    for fut in as_completed(futures):           # :674-684
        results.append(fut.result())
```

`derived`: bound the submitted batch to bound memory (backpressure). `as_completed` yields in completion order — sort results if deterministic ordering is required (`samples/library__concurrent.futures.rst:676-678`).

## Processes, queues and backpressure

Processes are spawned by creating a `Process`, then started and joined, normally under an `if __name__ == '__main__'` guard (`samples/library__multiprocessing.rst:64-77`,`:100-104`). `Process` arguments generally need to be picklable (`samples/library__multiprocessing.rst:102-104`). Start methods are `spawn`, `fork` and `forkserver`; `fork` is no longer the default on any platform (`samples/library__multiprocessing.rst:115-143`). The guidance is to avoid shared state where possible (`samples/library__multiprocessing.rst:349-356`) and use message passing via `Pipe` or a queue (`samples/library__multiprocessing.rst:838-842`). `Queue(maxsize)` is process-shared and pipe-backed with locks/semaphores (`samples/library__multiprocessing.rst:932-936`).

`derived`: a bounded `maxsize` is the backpressure knob; one queue per pipeline stage preserves deterministic ordering.

## Shutdown checklist

| Resource | Rule | Evidence |
|---|---|---|
| Daemon threads | abruptly stopped; resources may not be released | `samples/library__threading.rst:489-502` |
| Executor | use `with`; queued work joined at exit | `samples/library__concurrent.futures.rst:85-92`,`:170-175` |
| asyncio | `TaskGroup` waits for all tasks on exit | `samples/whatsnew__3.11.rst:578-583` |
| Async generator | close explicitly with `aclose` before loop teardown | `samples/reference__expressions.rst:1254-1255` |

Graceful thread shutdown uses a non-daemon thread plus an `Event` (`samples/library__threading.rst:496-502`).

## Sources

- https://docs.python.org/3/library/asyncio.html
- https://docs.python.org/3/library/threading.html
- https://docs.python.org/3/library/concurrent.futures.html
- https://docs.python.org/3/library/multiprocessing.html
- https://docs.python.org/3/whatsnew/3.11.html
- https://docs.python.org/3/whatsnew/3.13.html
- https://docs.python.org/3/whatsnew/3.14.html
