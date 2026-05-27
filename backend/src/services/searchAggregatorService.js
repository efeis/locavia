import { buildSearchJobs } from "./searchJobBuilder.js";
import { runSearchJobs } from "./searchJobRunner.js";

function deduplicateResults(results) {
  const seen = new Set();

  return results.filter((result) => {
    const key = `${result.title?.toLowerCase() || ""}|${result.address?.toLowerCase() || ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortMergedResults(results) {
  return results.sort((a, b) => {
    const aCount = a.userRatingCount ?? 0;
    const bCount = b.userRatingCount ?? 0;

    if (bCount !== aCount) {
      return bCount - aCount;
    }

    const aRating = a.rating ?? 0;
    const bRating = b.rating ?? 0;

    return bRating - aRating;
  });
}

export async function runSourceSearches(validatedCity, topic) {
  const jobs = buildSearchJobs();
  const jobResults = await runSearchJobs(jobs, validatedCity, topic);

  const mergedRawResults = jobResults.flatMap((job) => job.results || []);

  const sourcesUsed = jobResults
    .filter((job) => Array.isArray(job.results) && job.results.length > 0)
    .map((job) => job.source);

  const mergedResults = sortMergedResults(
    deduplicateResults(mergedRawResults)
  );

  return {
    jobs,
    sourcesUsed,
    mergedResults,
  };
}