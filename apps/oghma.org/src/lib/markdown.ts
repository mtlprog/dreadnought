import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Transform YouTube URLs into embedded iframes
 */
function remarkYouTube() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node) => {
      const firstChild = node.children[0];

      // Check if paragraph contains only a link
      if (
        node.children.length === 1 &&
        firstChild &&
        firstChild.type === "link"
      ) {
        const url = firstChild.url;

        // Check if it's a YouTube URL
        const youtubeRegex =
          /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(youtubeRegex);

        if (match) {
          const videoId = match[3];

          // Replace paragraph with HTML for iframe
          // @ts-expect-error - Adding custom type for HTML node
          node.type = "html";
          // @ts-expect-error - Setting value for HTML node
          node.value = `<div class="aspect-video w-full my-8 border-4 border-primary"><iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
          // @ts-expect-error - Removing children from HTML node
          delete node.children;
        }
      }
    });
  };
}

/**
 * Render Markdown to HTML with YouTube embed support
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse) // Parse Markdown
    .use(remarkGfm) // GitHub Flavored Markdown (tables, strikethrough, etc.)
    .use(remarkYouTube) // Convert YouTube URLs to iframes
    .use(remarkRehype, { allowDangerousHtml: true }) // Convert to HTML (allow our custom iframe HTML)
    .use(rehypeSlug) // Add IDs to headings
    .use(rehypeAutolinkHeadings) // Add links to headings
    .use(rehypeStringify, { allowDangerousHtml: true }) // Stringify to HTML
    .process(markdown);

  return String(file);
}
