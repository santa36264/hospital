/**
 * Centralized pagination guard: positive integers, pageSize max 100.
 * Invalid values are safely normalized rather than trusted.
 */
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

function normalizePagination(query = {}) {
  let page = Number(query.page);
  let pageSize = Number(query.pageSize);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return { page, pageSize };
}

module.exports = { normalizePagination, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE };
