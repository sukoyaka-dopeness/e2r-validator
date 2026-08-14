import assert from "node:assert/strict";
import test from "node:test";
import {
  collectNamesDraftRecognizedIdOccurrences,
  findNamesDraftRecognizedIdDuplicates,
  NAMES_DRAFT_EXTENSION_ID,
} from "../src/names-draft-uniqueness-detector.js";

function coreObject(id, expressions, extra = {}) {
  return {
    id,
    ...extra,
    extensions: {
      ...extra.extensions,
      [NAMES_DRAFT_EXTENSION_ID]: { expressions },
    },
  };
}

function dataset({ entities = [], events = [], relations = [], extensions } = {}) {
  return { version: "1.0", entities, events, relations, ...(extensions && { extensions }) };
}

function duplicateSummary(source) {
  return [...findNamesDraftRecognizedIdDuplicates(source)].map(([id, occurrences]) => ({
    id,
    paths: occurrences.map(({ path }) => path),
  }));
}

test("collects no occurrences without object-local recognized expressions", () => {
  const cases = [
    dataset(),
    dataset({ entities: [coreObject("E1", [])] }),
    dataset({
      extensions: {
        [NAMES_DRAFT_EXTENSION_ID]: { expressions: [{ id: "N1", value: "ignored" }] },
      },
    }),
  ];

  for (const source of cases) {
    assert.deepEqual([...collectNamesDraftRecognizedIdOccurrences(source)], []);
    assert.deepEqual([...findNamesDraftRecognizedIdDuplicates(source)], []);
  }
});

test("collects unique IDs across Entity, Event, and Relation in scan order", () => {
  const source = dataset({
    entities: [coreObject("E1", [
      { id: "N1", value: "Tokyo" },
      { id: "N2", value: "Tokyo" },
    ])],
    events: [coreObject("EV1", [{ id: "N3", value: "Arrival" }])],
    relations: [coreObject("R1", [{ id: "N4", value: "Occurred at" }])],
  });

  const occurrences = collectNamesDraftRecognizedIdOccurrences(source);
  assert.deepEqual([...occurrences.keys()], ["N1", "N2", "N3", "N4"]);
  assert.deepEqual(occurrences.get("N1"), [{
    id: "N1",
    collection: "entities",
    objectIndex: 0,
    expressionIndex: 0,
    path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
    objectId: "E1",
  }]);
  assert.equal(findNamesDraftRecognizedIdDuplicates(source).size, 0);
});

const pairCases = [
  ["same Entity", { entities: [coreObject("E1", [
    { id: "N1", value: "Tokyo" },
    { id: "N1", value: "Tokyo alternative" },
  ])] }],
  ["different Entities", { entities: [
    coreObject("E1", [{ id: "N1", value: "Tokyo" }]),
    coreObject("E2", [{ id: "N1", value: "Kyoto" }]),
  ] }],
  ["Entity/Event", {
    entities: [coreObject("E1", [{ id: "N1", value: "Tokyo" }])],
    events: [coreObject("EV1", [{ id: "N1", value: "Arrival" }])],
  }],
  ["Entity/Relation", {
    entities: [coreObject("E1", [{ id: "N1", value: "Tokyo" }])],
    relations: [coreObject("R1", [{ id: "N1", value: "Located in" }])],
  }],
  ["Event/Relation", {
    events: [coreObject("EV1", [{ id: "N1", value: "Arrival" }])],
    relations: [coreObject("R1", [{ id: "N1", value: "Occurred at" }])],
  }],
];

for (const [label, collections] of pairCases) {
  test(`detects a duplicate on ${label}`, () => {
    const duplicates = findNamesDraftRecognizedIdDuplicates(dataset(collections));
    assert.equal(duplicates.size, 1);
    assert.equal(duplicates.get("N1").length, 2);
  });
}

test("retains all three occurrences across Entity, Event, and Relation", () => {
  const source = dataset({
    entities: [coreObject("E1", [{ id: "N1", value: "Tokyo" }])],
    events: [coreObject("EV1", [{ id: "N1", value: "Arrival" }])],
    relations: [coreObject("R1", [{ id: "N1", value: "Occurred at" }])],
  });

  assert.deepEqual(duplicateSummary(source), [{
    id: "N1",
    paths: [
      `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
      `/events/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
      `/relations/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
    ],
  }]);
});

test("returns multiple independent duplicated IDs deterministically", () => {
  const source = dataset({
    entities: [coreObject("E1", [
      { id: "N1", value: "Tokyo" },
      { id: "N2", value: "Tokyo" },
    ])],
    events: [coreObject("EV1", [
      { id: "N2", value: "Arrival" },
      { id: "N1", value: "Departure" },
    ])],
  });

  assert.deepEqual([...findNamesDraftRecognizedIdDuplicates(source).keys()], ["N1", "N2"]);
});

test("includes recognized candidates despite local conformance failures", () => {
  const source = dataset({
    entities: [coreObject("E1", [
      { id: "N1", value: "Tokyo", language: 123 },
      { id: "", value: "Tokyo" },
      { id: "N2", value: "" },
    ])],
    events: [coreObject("EV1", [
      { id: "N1", value: "Arrival" },
      { id: "", value: "Departure" },
      { id: "N2", value: "Event" },
    ])],
  });

  assert.deepEqual([...findNamesDraftRecognizedIdDuplicates(source).keys()], ["N1", "", "N2"]);
});

test("excludes opaque members missing string id or value", () => {
  const source = dataset({
    entities: [coreObject("E1", [
      null,
      ["N1"],
      { id: "N1", opaqueFutureData: true },
      { id: "N1", value: 123 },
      { value: "Tokyo" },
      { id: 123, value: "Tokyo" },
      { id: "N2", value: "Tokyo" },
    ])],
    events: [coreObject("EV1", [{ id: "N1", value: "Arrival" }])],
  });

  assert.deepEqual([...collectNamesDraftRecognizedIdOccurrences(source).keys()], ["N2", "N1"]);
  assert.equal(findNamesDraftRecognizedIdDuplicates(source).size, 0);
});

test("does not compare Names IDs with Core or other Extension namespaces", () => {
  const source = dataset({
    entities: [{
      ...coreObject("N1", [{ id: "N2", value: "Tokyo" }]),
      extensions: {
        other: { records: [{ id: "N2" }] },
        [NAMES_DRAFT_EXTENSION_ID]: { expressions: [{ id: "N2", value: "Tokyo" }] },
      },
    }],
    events: [{ id: "N2" }],
    relations: [{ id: "R1", sourceId: "N1", targetId: "N2" }],
  });

  assert.equal(findNamesDraftRecognizedIdDuplicates(source).size, 0);
});

test("does not infer duplicate identity from equal values", () => {
  const source = dataset({
    entities: [coreObject("E1", [
      { id: "N1", value: "Tokyo" },
      { id: "N2", value: "Tokyo" },
    ])],
  });

  assert.equal(findNamesDraftRecognizedIdDuplicates(source).size, 0);
});

test("tolerates malformed Names payloads and malformed surrounding data", () => {
  const malformedPayloads = [null, [], "names", { expressions: null }, { expressions: {} }];
  const entities = malformedPayloads.map((payload, index) => ({
    id: `E${index}`,
    extensions: { [NAMES_DRAFT_EXTENSION_ID]: payload },
  }));
  entities.push(null, []);

  assert.doesNotThrow(() => collectNamesDraftRecognizedIdOccurrences(dataset({ entities })));
  assert.doesNotThrow(() => collectNamesDraftRecognizedIdOccurrences(null));
  assert.deepEqual([...collectNamesDraftRecognizedIdOccurrences(dataset({ entities }))], []);
});

test("does not mutate or normalize the Dataset or unknown Names fields", () => {
  const source = dataset({
    entities: [coreObject("E1", [
      { id: "N1", value: "Tokyo", future: null },
      { id: "N1", value: "東京", language: "ja", script: "Jpan" },
      { id: "opaque", future: { order: [2, 1] } },
    ])],
  });
  source.entities[0].extensions[NAMES_DRAFT_EXTENSION_ID].futurePayload = null;
  const before = structuredClone(source);

  findNamesDraftRecognizedIdDuplicates(source);

  assert.deepEqual(source, before);
});
