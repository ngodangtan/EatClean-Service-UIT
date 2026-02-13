/**
 * Run async tasks with a concurrency limit.
 * @param {Array<() => Promise>} tasks - Array of functions returning promises
 * @param {number} limit - Max concurrent tasks
 * @returns {Promise<Array>} - Results in original order
 */
export async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
