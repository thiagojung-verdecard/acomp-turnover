"""Feature engineering and preprocessing pipelines.

Transforms raw DataFrames into model-ready feature matrices.
All transformations must be reversible or at least reproducible —
always fit on train, transform on all splits.
"""

from __future__ import annotations
