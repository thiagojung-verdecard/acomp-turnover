"""Unit tests for the data loader module."""

from __future__ import annotations

from pathlib import Path

import pytest

from project_name.data.loader import load_csv


class TestLoadCsv:
    def test_returns_dataframe_with_correct_columns(self, sample_csv: Path) -> None:
        df = load_csv(sample_csv)
        assert list(df.columns) == ["id", "value"]

    def test_raises_when_file_not_found(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError, match="Dataset not found"):
            load_csv(tmp_path / "missing.csv")

    def test_raises_when_file_is_empty(self, tmp_path: Path) -> None:
        empty = tmp_path / "empty.csv"
        empty.write_text("id,value\n")  # Header only — no rows
        with pytest.raises(ValueError, match="Dataset is empty"):
            load_csv(empty)

    def test_row_count_matches_csv_content(self, sample_csv: Path) -> None:
        df = load_csv(sample_csv)
        assert len(df) == 3
