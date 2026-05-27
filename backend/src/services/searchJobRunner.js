import { searchPlaces } from "./placesService.js";
import { searchSerpApi } from "./serpApiService.js";

export async function runSearchJob(job, validatedCity, topic) {
  switch (job.type) {
    case "google_places":
      return {
        source: "google_places",
        results: await searchPlaces(validatedCity, topic),
      };

    case "serpapi":
      return {
        source: "serpapi",
        results: await searchSerpApi(validatedCity, topic),
      };

    default:
      return {
        source: job.type,
        results: [],
      };
  }
}

export async function runSearchJobs(jobs, validatedCity, topic) {
  const settledResults = await Promise.allSettled(
    jobs.map((job) => runSearchJob(job, validatedCity, topic))
  );

  return settledResults.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      source: jobs[index]?.type || "unknown",
      results: [],
    };
  });
}