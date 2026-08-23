const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildCompletion,
  buildGatewayRequest,
  processJob,
} = require("../worker");

const job = {
  id: 7n,
  threadId: 4n,
  owner: { toText: () => "aaaaa-aa" },
  question: "Hva med forrige sesong?",
  context: {
    season: "2026-27",
    league: "elite",
    route: "/ai-chat",
    playerIds: ["123"],
    teamIds: ["9"],
  },
  conversation: [
    { role: { user: null }, content: "Hvem var i best form?" },
    { role: { assistant: null }, content: "Sarah Deari Solheim." },
  ],
  attempts: 1n,
};

test("maps an ICP work item to the existing gateway contract", () => {
  const request = buildGatewayRequest(
    job,
    "backend-canister",
    "https://icp-api.io",
  );
  assert.equal(request.context.principal, "aaaaa-aa");
  assert.equal(request.context.season, "2026-27");
  assert.equal(request.conversation[1].role, "assistant");
  assert.deepEqual(request.context.entities, [
    { type: "player", id: "123" },
    { type: "team", id: "9" },
  ]);
});

test("maps structured gateway evidence back to Candid values", () => {
  const completion = buildCompletion({
    answer: "Datadrevet svar",
    status: "answered",
    generatedByAi: true,
    evidence: [{ label: "MEP", value: "5.74", unit: "snitt" }],
    sources: [{ label: "Kampdata", method: "player-stats/test.json" }],
    missingData: [],
    followUpQuestions: ["Sammenligne med en annen spiller?"],
  });
  assert.deepEqual(completion.answerStatus, { answered: null });
  assert.deepEqual(completion.evidence[0].unit, ["snitt"]);
  assert.equal(completion.evidence[0].title, "MEP");
  assert.equal(completion.sources[0].title, "Kampdata");
  assert.equal(completion.sources[0].method, "player-stats/test.json");
  assert.deepEqual(completion.report, []);
});

test("maps a PDF report attachment to a private Candid upload", () => {
  const pdf = Buffer.from("%PDF-1.7\nreport");
  const completion = buildCompletion({
    answer: "Rapporten er klar.",
    status: "answered",
    evidence: [],
    sources: [],
    missingData: [],
    followUpQuestions: [],
    report: {
      filename: "spillersammenligning.pdf",
      mimeType: "application/pdf",
      contentBase64: pdf.toString("base64"),
    },
  });
  assert.equal(completion.report.length, 1);
  assert.equal(completion.report[0].filename, "spillersammenligning.pdf");
  assert.equal(Buffer.from(completion.report[0].content).equals(pdf), true);
});

test("completes a claimed job after local analysis", async () => {
  let completed;
  const actor = {
    completeAiJob: async (jobId, completion) => {
      completed = { jobId, completion };
    },
    failAiJob: async () => assert.fail("job should not fail"),
  };
  await processJob({
    actor,
    job,
    chatUrl: "http://127.0.0.1:3000/v1/handball/chat",
    canisterId: "backend-canister",
    host: "https://icp-api.io",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        answer: "Sarah var best.",
        status: "answered",
        evidence: [],
        sources: [],
        missingData: [],
        followUpQuestions: [],
      }),
    }),
  });
  assert.equal(completed.jobId, 7n);
  assert.equal(completed.completion.answer, "Sarah var best.");
});
