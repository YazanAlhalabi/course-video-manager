export function capitalizeTitle(title: string): string {
  return title
    .split(" ")
    .map((word) => {
      const firstChar = word[0];
      return firstChar ? firstChar.toUpperCase() + word.slice(1) : word;
    })
    .join(" ");
}
