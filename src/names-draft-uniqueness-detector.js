export const NAMES_DRAFT_EXTENSION_ID = "draft.github.sukoyaka-dopeness.names";

const COLLECTIONS = ["entities", "events", "relations"];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recognizedCandidate(value) {
  return isObject(value)
    && typeof value.id === "string"
    && typeof value.value === "string";
}

export function collectNamesDraftRecognizedIdOccurrences(dataset) {
  const occurrencesById = new Map();
  if (!isObject(dataset)) return occurrencesById;

  for (const collection of COLLECTIONS) {
    if (!Array.isArray(dataset[collection])) continue;

    for (const [objectIndex, object] of dataset[collection].entries()) {
      if (!isObject(object)) continue;
      const payload = object.extensions?.[NAMES_DRAFT_EXTENSION_ID];
      if (!isObject(payload) || !Array.isArray(payload.expressions)) continue;

      for (const [expressionIndex, expression] of payload.expressions.entries()) {
        if (!recognizedCandidate(expression)) continue;

        const occurrence = {
          id: expression.id,
          collection,
          objectIndex,
          expressionIndex,
          path: `/${collection}/${objectIndex}/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/${expressionIndex}/id`,
        };
        if (typeof object.id === "string") occurrence.objectId = object.id;

        const occurrences = occurrencesById.get(expression.id) ?? [];
        occurrences.push(occurrence);
        occurrencesById.set(expression.id, occurrences);
      }
    }
  }

  return occurrencesById;
}

export function findNamesDraftRecognizedIdDuplicates(dataset) {
  return new Map(
    [...collectNamesDraftRecognizedIdOccurrences(dataset)]
      .filter(([, occurrences]) => occurrences.length > 1),
  );
}
