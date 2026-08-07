# Diagnostic Contract

This document defines the public diagnostic contract for the E2R Validator
CLI and library. It is intentionally independent of presentation language.

## Diagnostic result

The library returns a result with this shape:

```json
{
  "valid": false,
  "diagnostics": [
    {
      "severity": "error",
      "code": "relation_source_unresolved",
      "path": "/relations/0/sourceId",
      "relatedIds": ["missing-event"]
    }
  ]
}
```

`valid` is `true` exactly when no diagnostic has severity `error`. Warnings do
not make a Dataset invalid. The validator does not return a repaired Dataset.

Each diagnostic contains:

- `severity`: either `error` or `warning`.
- `code`: a stable machine-readable identifier in `snake_case`.
- `path`: an RFC 6901 JSON Pointer into the input document. The empty string
  identifies the whole document.
- `relatedIds`: optional Core Object IDs relevant to the diagnostic. It is
  omitted when there are no related IDs.

Human-readable messages are presentation output and are not part of the stable
contract. A future localized CLI may add a `message` field without changing
the meaning of `code` or `path`.

## Severity rules

Errors indicate that the recognized E2R rules are violated. Examples include
missing required Core fields, invalid collection types, duplicate IDs,
unresolved Relation endpoints, and invalid recognized Extension values.

Warnings indicate information that is allowed by E2R but deserves attention.
Examples include unknown Core fields, unknown fields inside a recognized
Extension, and unknown Extension names. Unknown data must not be rejected only
because the validator does not understand it.

## Initial stable codes

Core codes:

```text
dataset_not_object
json_parse_error
version_missing
version_invalid
entities_missing
entities_invalid
events_missing
events_invalid
relations_missing
relations_invalid
core_object_not_object
core_object_id_missing
core_object_id_invalid
core_object_id_duplicate
relation_source_id_missing
relation_source_id_invalid
relation_target_id_missing
relation_target_id_invalid
relation_source_unresolved
relation_target_unresolved
relation_source_is_relation
relation_target_is_relation
```

Additional Extension-specific codes must be namespaced by their conceptual
area, for example `metadata_dataset_id_invalid` or
`history_time_invalid`. Codes are never reused for a different condition.
Retiring a code requires a documented migration note.

## JSON Pointer rules

Paths use RFC 6901 encoding:

- `/` is encoded as `~1`.
- `~` is encoded as `~0`.
- Array indexes are decimal path segments.

Examples:

```text
/version
/entities/0/id
/relations/2/sourceId
/extensions/metadata/datasetId
```

Diagnostics should point to the smallest useful invalid value. A missing
property points to where that property belongs, such as `/version`.

## CLI exit codes

The CLI uses these process exit codes:

```text
0  Input is valid; warnings are allowed.
1  Input was read and parsed, but has one or more validation errors.
2  The input could not be read or parsed as JSON, or CLI arguments are invalid.
```

The distinction between exit code `1` and `2` allows CI users to distinguish a
bad Dataset from an invocation or transport problem.

## Compatibility

Consumers may depend on `severity`, `code`, `path`, and `relatedIds`. They must
not parse human-readable text to determine validity. New diagnostic codes may
be added; existing consumers should handle unknown codes gracefully.
