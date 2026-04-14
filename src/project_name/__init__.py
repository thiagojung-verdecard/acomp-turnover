"""project_name — <one-line description>.

This package follows the conventions defined in the workspace `.github/instructions/`.
"""

from .data.pool_client import DatabasePoolClient, PoolClientConfig

__version__ = "0.1.0"

__all__ = ["DatabasePoolClient", "PoolClientConfig", "__version__"]
