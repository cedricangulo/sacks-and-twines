const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

export const formatDate = (timestamp: number) =>
  dateFormatter.format(new Date(timestamp))
