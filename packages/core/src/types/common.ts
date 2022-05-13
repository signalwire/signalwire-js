export type PaginationCursor =
  | {
      before: string
      after?: never
    }
  | {
      before?: never
      after: string
    }
