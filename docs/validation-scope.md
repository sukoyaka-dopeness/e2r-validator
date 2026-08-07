# Validation Scope

The first implementation targets Core 1.0, Metadata Extension v1, and
History Extension v1. JSON syntax, structural constraints, and Dataset-level
semantic constraints are separate validation layers.

Unknown Core fields and unknown Extensions are forward-compatible. They may be
reported as warnings, but their presence alone does not invalidate a Dataset.

The validator reports stable codes, JSON Pointer paths, severity, and related
IDs where applicable. It does not edit input data.
