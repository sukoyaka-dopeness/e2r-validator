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

Specification Extension draft `0.1.0` support-state codes:

```text
extension_version_unspecified
specification_version_unsupported
specification_unavailable
specification_required_dependency_unsupported
```

Specification declaration and dependency conformance codes:

```text
specification_scope_invalid
specification_invalid
specification_spec_version_missing
specification_spec_version_invalid
specification_uses_invalid
specification_use_invalid
specification_extension_invalid
specification_version_invalid
specification_features_invalid
specification_feature_invalid
specification_feature_duplicate
specification_features_not_defined
specification_self_declaration
specification_declaration_duplicate
specification_declaration_missing
specification_declared_payload_missing
specification_required_dependency_missing
specification_required_dependency_version_mismatch
```

Specification definition, lifecycle, and evolution structure codes:

```text
specification_definitions_invalid
specification_definition_invalid
specification_definition_duplicate
specification_definition_features_invalid
specification_definition_feature_invalid
specification_definition_feature_duplicate
specification_field_invalid
specification_documentation_invalid
specification_dependencies_invalid
specification_dependency_invalid
specification_dependency_target_invalid
specification_dependency_constraint_invalid
specification_dependency_source_feature_unknown
specification_dependency_target_feature_unknown
specification_reference_invalid
specification_lifecycle_invalid
specification_lifecycle_status_invalid
specification_deprecated_by_invalid
specification_evolution_invalid
specification_evolution_type_invalid
specification_evolution_targets_invalid
specification_evolution_target_duplicate
```

Coordinate interoperability prototype `0.1.0` codes:

```text
coordinate_dataset_payload_missing
coordinate_dataset_payload_invalid
coordinate_format_version_missing
coordinate_format_version_invalid
coordinate_version_declaration_conflict
coordinate_spaces_invalid
coordinate_space_invalid
coordinate_space_id_invalid
coordinate_space_id_duplicate
coordinate_space_field_invalid
coordinate_components_invalid
coordinate_component_id_invalid
coordinate_component_invalid
coordinate_component_field_invalid
coordinate_component_range_invalid
coordinate_component_period_invalid
coordinate_external_reference_invalid
coordinate_scope_invalid
coordinate_object_payload_invalid
coordinate_coordinates_invalid
coordinate_invalid
coordinate_space_reference_invalid
coordinate_space_coordinate_duplicate
coordinate_space_unresolved
coordinate_values_invalid
coordinate_component_unresolved
coordinate_value_invalid
coordinate_value_out_of_range
```

These codes are errors in the recognized experimental Coordinate layer, not
Core structural errors. `coordinate_version_unsupported` is a warning. A
combined result containing a Coordinate error has `valid: false`; the code
namespace preserves which validation layer failed.

Coordinate Extension draft `0.1.0` codes:

```text
coordinate_draft_dataset_payload_missing
coordinate_draft_dataset_payload_invalid
coordinate_draft_spec_version_missing
coordinate_draft_spec_version_invalid
coordinate_draft_version_declaration_missing
coordinate_draft_version_declaration_duplicate
coordinate_draft_version_declaration_conflict
coordinate_draft_prototype_version_field_prohibited
coordinate_draft_spaces_invalid
coordinate_draft_space_invalid
coordinate_draft_space_id_invalid
coordinate_draft_space_id_duplicate
coordinate_draft_space_field_invalid
coordinate_draft_components_invalid
coordinate_draft_component_id_invalid
coordinate_draft_component_invalid
coordinate_draft_component_field_invalid
coordinate_draft_component_bounds_inverted
coordinate_draft_component_period_invalid
coordinate_draft_external_reference_invalid
coordinate_draft_external_component_without_reference
coordinate_draft_external_component_duplicate
coordinate_draft_scope_invalid
coordinate_draft_object_payload_invalid
coordinate_draft_object_version_field_prohibited
coordinate_draft_coordinates_invalid
coordinate_draft_coordinate_invalid
coordinate_draft_space_reference_invalid
coordinate_draft_object_space_duplicate
coordinate_draft_space_unresolved
coordinate_draft_values_invalid
coordinate_draft_component_unresolved
coordinate_draft_value_invalid
coordinate_draft_value_out_of_range
```

These are errors in the recognized Draft layer. The distinct
`coordinate_draft_version_unsupported` code is a warning, and later exact
versions are not validated using `0.1.0` rules. Draft validation is read-only
and does not resolve external definitions or authorize writes.

Support-state codes are warnings. The other codes above are errors. The
semantic distinctions and offline behavior are documented in
`docs/specification-interoperability.md`.

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
