/**
 * Pre-processes AI-generated markdown to convert JSX-style ChooseScreenshot
 * tags into HTML-compatible syntax that rehype-raw can parse.
 *
 * Converts: <ChooseScreenshot clipIndex={1} alt="test" />
 * Into:     <choosescreenshot clipindex="1" alt="test"></choosescreenshot>
 */
export function preprocessChooseScreenshotMarkdown(md: string): string {
  return md.replace(
    /<ChooseScreenshot\s+([^>]*?)\/>/g,
    (_match, attrs: string) => {
      const htmlAttrs = attrs
        .replace(/=\{([^}]+)\}/g, '="$1"')
        .replace(
          /([a-zA-Z]+)=/g,
          (_m: string, name: string) => `${name.toLowerCase()}=`
        )
        .trim();
      return `<choosescreenshot ${htmlAttrs}></choosescreenshot>`;
    }
  );
}
