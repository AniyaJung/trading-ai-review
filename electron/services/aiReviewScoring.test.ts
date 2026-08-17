import { describe, expect, it } from "vitest";
import { scoreGeneratedAIReview } from "./aiReviewScoring";

const perfectBreakdown = {
  ruleAdherence: 100,
  evidenceQuality: 100,
  executionQuality: 100,
};

describe("scoreGeneratedAIReview", () => {
  it("prevents a perfect score when screenshots are missing", () => {
    expect(
      scoreGeneratedAIReview({
        reportedScoreTotal: 100,
        scoreBreakdown: perfectBreakdown,
        attachmentCount: 0,
        hasCompleteEvidenceCoverage: false,
        missingInfoCount: 0,
        imageObservationCount: 0,
        ruleChecks: [],
        hasBoundRule: true,
        hasDefinedRisk: true,
      }),
    ).toEqual({
      scoreTotal: 72,
      scoreBreakdown: {
        ruleAdherence: 100,
        evidenceQuality: 20,
        executionQuality: 100,
      },
      scoringVersion: "three-dimension-v1",
    });
  });

  it("caps weak evidence and unresolved rule checks independently", () => {
    const result = scoreGeneratedAIReview({
      reportedScoreTotal: 100,
      scoreBreakdown: perfectBreakdown,
      attachmentCount: 1,
      hasCompleteEvidenceCoverage: false,
      missingInfoCount: 1,
      imageObservationCount: 1,
      ruleChecks: [
        {
          checkItem: "Entry trigger confirmed",
          result: "unknown",
          evidence: null,
          comment: "The screenshot has no entry marker.",
          scoreDelta: 0,
        },
      ],
      hasBoundRule: true,
      hasDefinedRisk: true,
    });

    expect(result).toEqual({
      scoreTotal: 80,
      scoreBreakdown: {
        ruleAdherence: 75,
        evidenceQuality: 70,
        executionQuality: 100,
      },
      scoringVersion: "three-dimension-v1",
    });
  });

  it("does not treat one partial screenshot as complete evidence", () => {
    expect(
      scoreGeneratedAIReview({
        reportedScoreTotal: 100,
        scoreBreakdown: perfectBreakdown,
        attachmentCount: 1,
        hasCompleteEvidenceCoverage: false,
        missingInfoCount: 0,
        imageObservationCount: 1,
        ruleChecks: [],
        hasBoundRule: true,
        hasDefinedRisk: true,
      }),
    ).toEqual(
      expect.objectContaining({
        scoreTotal: 93,
        scoreBreakdown: {
          ruleAdherence: 100,
          evidenceQuality: 80,
          executionQuality: 100,
        },
      }),
    );
  });

  it("allows 100 only when all three dimensions are complete", () => {
    expect(
      scoreGeneratedAIReview({
        reportedScoreTotal: null,
        scoreBreakdown: perfectBreakdown,
        attachmentCount: 2,
        hasCompleteEvidenceCoverage: true,
        missingInfoCount: 0,
        imageObservationCount: 2,
        ruleChecks: [
          {
            checkItem: "Entry trigger confirmed",
            result: "pass",
            evidence: "Marked chart confirms the trigger.",
            comment: null,
            scoreDelta: 0,
          },
        ],
        hasBoundRule: true,
        hasDefinedRisk: true,
      }),
    ).toEqual(
      expect.objectContaining({
        scoreTotal: 100,
        scoreBreakdown: perfectBreakdown,
      }),
    );
  });
});
