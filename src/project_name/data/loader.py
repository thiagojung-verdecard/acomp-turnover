"""Data loading utilities.

Responsible for reading raw data sources and returning typed DataFrames.
No feature engineering here — that belongs in preprocessing.py.
"""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd

from project_name.data.pool_client import DatabasePoolClient, PoolClientConfig


def load_csv(path: Path, *, encoding: str = "utf-8") -> pd.DataFrame:
    """Load a CSV file into a DataFrame with basic validation.

    Args:
        path: Absolute or relative path to the CSV file.
        encoding: File encoding. Defaults to UTF-8.

    Returns:
        Raw DataFrame with original dtypes.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file is empty.
    """
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path, encoding=encoding)

    if df.empty:
        raise ValueError(f"Dataset is empty: {path}")

    return df


def load_sql_query(query: str, *, database: str, timeout: int = 300) -> pd.DataFrame:
    """Load a SQL query result from the HTTP database pool.

    Args:
        query: SQL statement to execute in the remote pool service.
        database: Logical database name accepted by the pool service.
        timeout: Request timeout in seconds.

    Returns:
        Query result as an uppercased pandas DataFrame.

    Raises:
        ValueError: If the query is blank.
    """
    if not query.strip():
        raise ValueError("Query must not be empty.")

    config = PoolClientConfig.from_env(runtime=os.getenv("POOL_RUNTIME", "Linux"))
    client = DatabasePoolClient(config)
    return client.get_df(query=query, database=database, timeout=timeout)
