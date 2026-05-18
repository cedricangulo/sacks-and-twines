import { debounce, parseAsString, useQueryState } from "nuqs"

export function useSearchFilter() {
  return useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
      shallow: false,
      limitUrlUpdates: debounce(300),
    })
  )
}
