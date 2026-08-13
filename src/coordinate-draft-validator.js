import { diagnostic, SEVERITIES } from "./diagnostics.js";

export const COORDINATE_DRAFT_EXTENSION_ID =
  "draft.github.sukoyaka-dopeness.coordinate";
export const COORDINATE_DRAFT_VERSION = "0.1.0";

const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function add(diagnostics, severity, code, path) {
  diagnostics.push(diagnostic(severity, code, path));
}

function validateExternalReference(value, path, diagnostics) {
  if (!isObject(value)) {
    add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_external_reference_invalid", path);
    return false;
  }

  let valid = true;
  for (const field of ["authority", "identifier"]) {
    if (!nonEmptyString(value[field])) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_external_reference_invalid",
        `${path}/${field}`,
      );
      valid = false;
    }
  }
  return valid;
}

function validateComponent(value, path, hasExternalReference, diagnostics) {
  if (!isObject(value)) {
    add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_component_invalid", path);
    return false;
  }

  let valid = true;
  for (const field of ["name", "unit", "positiveDirection", "externalComponent"]) {
    if (field in value && !nonEmptyString(value[field])) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_component_field_invalid",
        `${path}/${field}`,
      );
      valid = false;
    }
  }
  if ("externalComponent" in value && !hasExternalReference) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_external_component_without_reference",
      `${path}/externalComponent`,
    );
    valid = false;
  }
  for (const field of ["minimum", "maximum", "period"]) {
    if (field in value && !finiteNumber(value[field])) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_component_field_invalid",
        `${path}/${field}`,
      );
      valid = false;
    }
  }
  if (finiteNumber(value.minimum) && finiteNumber(value.maximum) && value.minimum > value.maximum) {
    add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_component_bounds_inverted", path);
    valid = false;
  }
  if (finiteNumber(value.period) && value.period <= 0) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_component_period_invalid",
      `${path}/period`,
    );
    valid = false;
  }
  return valid;
}

function validateSpaces(value, path, diagnostics) {
  const spaces = new Map();
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_spaces_invalid", path);
    return spaces;
  }

  for (const [index, candidate] of value.entries()) {
    const spacePath = `${path}/${index}`;
    if (!isObject(candidate)) {
      add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_space_invalid", spacePath);
      continue;
    }

    let valid = true;
    if (!nonEmptyString(candidate.id)) {
      add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_space_id_invalid", `${spacePath}/id`);
      valid = false;
    } else if (spaces.has(candidate.id)) {
      add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_space_id_duplicate", `${spacePath}/id`);
      valid = false;
    }
    for (const field of ["name", "kind"]) {
      if (field in candidate && !nonEmptyString(candidate[field])) {
        add(
          diagnostics,
          SEVERITIES.ERROR,
          "coordinate_draft_space_field_invalid",
          `${spacePath}/${field}`,
        );
        valid = false;
      }
    }

    const hasExternalReference = "externalReference" in candidate;
    if (hasExternalReference) {
      valid = validateExternalReference(
        candidate.externalReference,
        `${spacePath}/externalReference`,
        diagnostics,
      ) && valid;
    }

    const components = new Map();
    const externalComponents = new Set();
    if (!isObject(candidate.components) || Object.keys(candidate.components).length === 0) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_components_invalid",
        `${spacePath}/components`,
      );
      valid = false;
    } else {
      for (const [componentId, component] of Object.entries(candidate.components)) {
        const componentPath = `${spacePath}/components/${pointerSegment(componentId)}`;
        if (!nonEmptyString(componentId)) {
          add(
            diagnostics,
            SEVERITIES.ERROR,
            "coordinate_draft_component_id_invalid",
            componentPath,
          );
          valid = false;
          continue;
        }
        components.set(componentId, isObject(component) ? {
          minimum: component.minimum,
          maximum: component.maximum,
        } : {});
        valid = validateComponent(component, componentPath, hasExternalReference, diagnostics) && valid;
        if (isObject(component) && nonEmptyString(component.externalComponent)) {
          if (externalComponents.has(component.externalComponent)) {
            add(
              diagnostics,
              SEVERITIES.ERROR,
              "coordinate_draft_external_component_duplicate",
              `${componentPath}/externalComponent`,
            );
            valid = false;
          } else {
            externalComponents.add(component.externalComponent);
          }
        }
      }
    }

    if (nonEmptyString(candidate.id) && !spaces.has(candidate.id)) {
      spaces.set(candidate.id, { components, valid });
    }
  }
  return spaces;
}

function validateObjectCoordinates(payload, path, spaces, diagnostics) {
  if (!isObject(payload)) {
    add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_object_payload_invalid", path);
    return;
  }
  for (const field of ["specVersion", "formatVersion"]) {
    if (field in payload) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_object_version_field_prohibited",
        `${path}/${field}`,
      );
    }
  }
  if (!Array.isArray(payload.coordinates) || payload.coordinates.length === 0) {
    add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_coordinates_invalid", `${path}/coordinates`);
    return;
  }

  const seenSpaces = new Set();
  for (const [index, coordinate] of payload.coordinates.entries()) {
    const coordinatePath = `${path}/coordinates/${index}`;
    if (!isObject(coordinate)) {
      add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_coordinate_invalid", coordinatePath);
      continue;
    }
    if (!nonEmptyString(coordinate.spaceId)) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_space_reference_invalid",
        `${coordinatePath}/spaceId`,
      );
      continue;
    }
    if (seenSpaces.has(coordinate.spaceId)) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_object_space_duplicate",
        `${coordinatePath}/spaceId`,
      );
      continue;
    }
    seenSpaces.add(coordinate.spaceId);

    const space = spaces.get(coordinate.spaceId);
    if (!space) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_space_unresolved",
        `${coordinatePath}/spaceId`,
      );
      continue;
    }
    if (!isObject(coordinate.values) || Object.keys(coordinate.values).length === 0) {
      add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_values_invalid", `${coordinatePath}/values`);
      continue;
    }
    for (const [componentId, componentValue] of Object.entries(coordinate.values)) {
      const valuePath = `${coordinatePath}/values/${pointerSegment(componentId)}`;
      const component = space.components.get(componentId);
      if (!component) {
        add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_component_unresolved", valuePath);
      } else if (!finiteNumber(componentValue)) {
        add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_value_invalid", valuePath);
      } else if (
        (finiteNumber(component.minimum) && componentValue < component.minimum)
        || (finiteNumber(component.maximum) && componentValue > component.maximum)
      ) {
        add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_value_out_of_range", valuePath);
      }
    }
  }
}

function validateSpecificationAgreement(payload, specificationPayload, specificationPath, diagnostics) {
  if (
    !isObject(specificationPayload)
    || !Array.isArray(specificationPayload.uses)
  ) return;

  const declarations = specificationPayload.uses.filter(
    (candidate) => isObject(candidate) && candidate.extension === COORDINATE_DRAFT_EXTENSION_ID,
  );
  const usesPath = `${specificationPath}/uses`;
  if (declarations.length === 0) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_version_declaration_missing",
      usesPath,
    );
  } else if (declarations.length > 1) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_version_declaration_duplicate",
      usesPath,
    );
  } else if (declarations[0].version !== payload.specVersion) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_version_declaration_conflict",
      usesPath,
    );
  }
}

export function validateCoordinateDraftExtension(
  occurrences,
  specificationPayload,
  specificationPath,
) {
  const diagnostics = [];
  const datasetPath = `/extensions/${pointerSegment(COORDINATE_DRAFT_EXTENSION_ID)}`;
  const datasetOccurrence = occurrences.find(({ path }) => path === datasetPath);
  const objectOccurrences = occurrences.filter(({ path }) => path !== datasetPath);

  if (!datasetOccurrence) {
    for (const occurrence of objectOccurrences) {
      add(
        diagnostics,
        SEVERITIES.ERROR,
        "coordinate_draft_dataset_payload_missing",
        occurrence.path,
      );
    }
    return diagnostics;
  }
  if (!isObject(datasetOccurrence.value)) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_dataset_payload_invalid",
      datasetPath,
    );
    return diagnostics;
  }

  const payload = datasetOccurrence.value;
  if (!("specVersion" in payload)) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_spec_version_missing",
      `${datasetPath}/specVersion`,
    );
    return diagnostics;
  }
  if (!nonEmptyString(payload.specVersion) || !VERSION_PATTERN.test(payload.specVersion)) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_spec_version_invalid",
      `${datasetPath}/specVersion`,
    );
    return diagnostics;
  }

  validateSpecificationAgreement(payload, specificationPayload, specificationPath, diagnostics);
  if (payload.specVersion !== COORDINATE_DRAFT_VERSION) {
    add(
      diagnostics,
      SEVERITIES.WARNING,
      "coordinate_draft_version_unsupported",
      `${datasetPath}/specVersion`,
    );
    return diagnostics;
  }

  if ("formatVersion" in payload) {
    add(
      diagnostics,
      SEVERITIES.ERROR,
      "coordinate_draft_prototype_version_field_prohibited",
      `${datasetPath}/formatVersion`,
    );
  }
  const spaces = validateSpaces(payload.spaces, `${datasetPath}/spaces`, diagnostics);
  for (const occurrence of objectOccurrences) {
    if (occurrence.path.startsWith("/relations/")) {
      add(diagnostics, SEVERITIES.ERROR, "coordinate_draft_scope_invalid", occurrence.path);
      continue;
    }
    validateObjectCoordinates(occurrence.value, occurrence.path, spaces, diagnostics);
  }
  return diagnostics;
}
