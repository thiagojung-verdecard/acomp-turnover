"""HTTP client for the internal SQL pool service.

This module centralizes read, execute, and dataframe upload operations used by
dashboard backends that depend on the existing pool infrastructure.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any

import pandas as pd
import requests


class PoolClientError(RuntimeError):
    """Raised when the pool service returns an unexpected response."""


@dataclass(frozen=True)
class PoolClientConfig:
    """Connection settings for the HTTP database pool service."""

    host: str
    port: int = 8080

    @property
    def base_url(self) -> str:
        """Return the normalized HTTP base URL for the pool service."""
        return f"http://{self.host}:{self.port}"

    @classmethod
    def from_env(cls, runtime: str = "Linux") -> "PoolClientConfig":
        """Build config from environment variables with runtime fallbacks.

        Environment variables:
            POOL_HOST: Overrides host for any environment.
            POOL_PORT: Overrides port for any environment.
            POOL_HOST_LINUX: Optional Linux-specific host.
            POOL_HOST_WINDOWS: Optional Windows-specific host.
        """
        runtime_key = runtime.strip().lower()
        default_host = "172.22.1.202" if runtime_key == "linux" else "qqmtz1598"

        host = (
            os.getenv("POOL_HOST")
            or os.getenv(f"POOL_HOST_{runtime_key.upper()}")
            or default_host
        )
        port = int(os.getenv("POOL_PORT", "8080"))
        return cls(host=host, port=port)


class DatabasePoolClient:
    """Typed wrapper around the pool service HTTP endpoints."""

    def __init__(self, config: PoolClientConfig, session: requests.Session | None = None) -> None:
        self._config = config
        self._session = session or requests.Session()

    def get_df(self, query: str, database: str, timeout: int = 300) -> pd.DataFrame:
        """Execute a read query and return the result as a normalized DataFrame."""
        payload = {"database": database, "sql": query, "timeout": timeout}
        response = self._post("/read_sql/", payload, timeout=timeout)

        try:
            df = pd.read_json(response.json())
        except ValueError as error:
            raise PoolClientError("Pool service returned an invalid JSON dataframe payload.") from error

        timestamp_columns = [column for column in df.columns if column.startswith("timestamp_")]
        if timestamp_columns:
            df = df.rename(columns={column: column.removeprefix("timestamp_") for column in timestamp_columns})

        df.columns = df.columns.str.upper()
        return df

    def execute(self, query: str, database: str, timeout: int = 300) -> str:
        """Execute a write statement in the remote database."""
        payload = {"database": database, "sql": query}
        self._post("/execute_sql/", payload, timeout=timeout)
        return "Execution ok"

    def insert_df(
        self,
        table_name: str,
        database: str,
        df: pd.DataFrame | None = None,
        if_exists: str | None = None,
        convert: bool = True,
        local_path: str | None = None,
        timeout: int = 300,
    ) -> str:
        """Upload a dataframe to the remote pool service."""
        normalized_df = self._prepare_dataframe(df)

        payload: dict[str, Any] = {
            "database": database,
            "table_name": table_name,
            "data": normalized_df.to_json(orient="records", date_format="iso")
            if convert and normalized_df is not None
            else None,
            "if_exists": if_exists,
            "convert": convert,
            "caminho_local": local_path,
        }

        self._post("/upload_dataframe/", payload, timeout=timeout)
        return "Upload ok"

    def _prepare_dataframe(self, df: pd.DataFrame | None) -> pd.DataFrame | None:
        if df is None or df.empty:
            return df

        datetime_columns = df.columns[df.dtypes == "datetime64[ns]"]
        if len(datetime_columns) == 0:
            return df

        return df.rename(columns={column: f"timestamp_{column}" for column in datetime_columns})

    def _post(self, path: str, payload: dict[str, Any], timeout: int) -> requests.Response:
        try:
            response = self._session.post(
                f"{self._config.base_url}{path}",
                json=payload,
                timeout=timeout,
            )
        except requests.RequestException as error:
            raise PoolClientError("Failed to connect to the pool service.") from error

        if response.status_code != 200:
            raise PoolClientError(response.text)

        return response