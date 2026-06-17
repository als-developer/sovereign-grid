"""
Context Managers - Custom Context Managers
For managing resources, transactions, and timing
Version: 31.0
"""

import time
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class TimerContext:
    """Context manager for timing code execution"""
    
    def __init__(self, name: str = "operation"):
        self.name = name
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        duration = self.elapsed_ms
        if exc_type:
            logger.warning(f"{self.name} failed after {duration:.2f}ms")
        else:
            logger.debug(f"{self.name} completed in {duration:.2f}ms")
    
    @property
    def elapsed_ms(self) -> float:
        """Get elapsed time in milliseconds"""
        if self.start_time is None:
            return 0.0
        end = self.end_time or time.perf_counter()
        return (end - self.start_time) * 1000


@asynccontextmanager
async def transaction_context():
    """Context manager for database transactions"""
    from core.db_pool import DatabasePool
    
    async with DatabasePool.transaction() as conn:
        try:
            yield conn
        except Exception as e:
            logger.error(f"Transaction rolled back: {e}")
            raise


@asynccontextmanager
async def redis_lock(lock_key: str, timeout: int = 10, retry_interval: float = 0.1):
    """Distributed lock using Redis"""
    from core.redis_client import redis_client
    import asyncio
    
    acquired = False
    start_time = time.time()
    
    while not acquired and (time.time() - start_time) < timeout:
        acquired = await redis_client.setnx(lock_key, "locked")
        if acquired:
            await redis_client.expire(lock_key, timeout)
            break
        await asyncio.sleep(retry_interval)
    
    if not acquired:
        raise TimeoutError(f"Failed to acquire lock: {lock_key}")
    
    try:
        yield
    finally:
        if acquired:
            await redis_client.delete(lock_key)


@asynccontextmanager
async def rate_limit_context(key: str, max_requests: int, window_seconds: int = 60):
    """Context manager for rate limiting"""
    from core.redis_client import redis_client
    import time
    
    current = await redis_client.incr(key)
    if current == 1:
        await redis_client.expire(key, window_seconds)
    
    if current > max_requests:
        raise Exception(f"Rate limit exceeded for {key}")
    
    try:
        yield
    finally:
        pass


class ErrorHandlerContext:
    """Context manager for error handling with recovery"""
    
    def __init__(self, operation: str, fallback: Any = None):
        self.operation = operation
        self.fallback = fallback
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            logger.error(f"Error in {self.operation}: {exc_val}")
            if self.fallback is not None:
                return True
        return False
