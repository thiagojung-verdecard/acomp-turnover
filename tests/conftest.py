"""Shared pytest fixtures and configuration for the test suite.

Add project-wide fixtures here. Module-specific fixtures stay in their own test files.
"""

from __future__ import annotations

import pytest
import pandas as pd
from pathlib import Path


@pytest.fixture
def sample_csv(tmp_path: Path) -> Path:
    """Create a minimal CSV file for loader tests."""
    csv_file = tmp_path / "sample.csv"
    csv_file.write_text("id,value\n1,10\n2,20\n3,30\n")
    return csv_file


@pytest.fixture
def sample_dataframe() -> pd.DataFrame:
    """Return a small DataFrame for preprocessing/model tests."""
    return pd.DataFrame({"id": [1, 2, 3], "value": [10.0, 20.0, 30.0]})
