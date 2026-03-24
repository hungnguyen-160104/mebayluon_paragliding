// types/post-blocks.ts
// Block-based content types for flexible post builder

export type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "gallery"
  | "quote"
  | "list"
  | "cta"
  | "video"
  | "faq"
  | "table"
  | "divider"
  | "html";

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  content: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 2 | 3 | 4;
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt?: string;
  caption?: string;
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  images: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
  columns?: 2 | 3 | 4;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  content: string;
  author?: string;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  style: "bullet" | "numbered";
  items: string[];
}

export interface CTABlock extends BaseBlock {
  type: "cta";
  text: string;
  buttonText: string;
  buttonUrl: string;
  variant?: "primary" | "secondary";
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  url: string; // YouTube/Vimeo embed URL
  caption?: string;
}

export interface FAQBlock extends BaseBlock {
  type: "faq";
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export interface HTMLBlock extends BaseBlock {
  type: "html";
  content: string;
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | GalleryBlock
  | QuoteBlock
  | ListBlock
  | CTABlock
  | VideoBlock
  | FAQBlock
  | TableBlock
  | DividerBlock
  | HTMLBlock;

// Block type metadata for UI
export const BLOCK_TYPES: Array<{
  type: BlockType;
  label: string;
  icon: string;
  description: string;
}> = [
  { type: "paragraph", label: "Đoạn văn", icon: "AlignLeft", description: "Văn bản thường" },
  { type: "heading", label: "Tiêu đề", icon: "Heading", description: "Tiêu đề phụ (H2-H4)" },
  { type: "image", label: "Ảnh", icon: "Image", description: "Ảnh đơn với caption" },
  { type: "gallery", label: "Gallery", icon: "Images", description: "Bộ sưu tập ảnh" },
  { type: "quote", label: "Trích dẫn", icon: "Quote", description: "Câu trích dẫn" },
  { type: "list", label: "Danh sách", icon: "List", description: "Danh sách bullet/số" },
  { type: "cta", label: "CTA", icon: "MousePointer", description: "Call to action" },
  { type: "video", label: "Video", icon: "Play", description: "Nhúng YouTube/Vimeo" },
  { type: "faq", label: "FAQ", icon: "HelpCircle", description: "Câu hỏi thường gặp" },
  { type: "table", label: "Bảng", icon: "Table", description: "Bảng thông tin" },
  { type: "divider", label: "Đường kẻ", icon: "Minus", description: "Đường phân cách" },
  { type: "html", label: "HTML", icon: "Code", description: "Mã HTML tùy chỉnh" },
];

// Helper to create new block with default values
export function createBlock(type: BlockType): ContentBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  switch (type) {
    case "paragraph":
      return { id, type, content: "" };
    case "heading":
      return { id, type, level: 2, content: "" };
    case "image":
      return { id, type, url: "", alt: "", caption: "" };
    case "gallery":
      return { id, type, images: [], columns: 3 };
    case "quote":
      return { id, type, content: "", author: "" };
    case "list":
      return { id, type, style: "bullet", items: [""] };
    case "cta":
      return { id, type, text: "", buttonText: "Xem thêm", buttonUrl: "", variant: "primary" };
    case "video":
      return { id, type, url: "", caption: "" };
    case "faq":
      return { id, type, items: [{ question: "", answer: "" }] };
    case "table":
      return { id, type, headers: ["Cột 1", "Cột 2"], rows: [["", ""]] };
    case "divider":
      return { id, type };
    case "html":
      return { id, type, content: "" };
    default:
      return { id, type: "paragraph", content: "" };
  }
}

// Convert blocks to HTML for storage
export function blocksToHTML(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case "paragraph":
        return `<p>${block.content}</p>`;

      case "heading":
        const tag = `h${block.level}`;
        return `<${tag}>${block.content}</${tag}>`;

      case "image":
        let img = `<figure><img src="${block.url}" alt="${block.alt || ""}" />`;
        if (block.caption) img += `<figcaption>${block.caption}</figcaption>`;
        img += `</figure>`;
        return img;

      case "gallery":
        const cols = block.columns || 3;
        let gallery = `<div class="gallery gallery-cols-${cols}">`;
        block.images.forEach(img => {
          gallery += `<figure><img src="${img.url}" alt="${img.alt || ""}" />`;
          if (img.caption) gallery += `<figcaption>${img.caption}</figcaption>`;
          gallery += `</figure>`;
        });
        gallery += `</div>`;
        return gallery;

      case "quote":
        let quote = `<blockquote><p>${block.content}</p>`;
        if (block.author) quote += `<cite>— ${block.author}</cite>`;
        quote += `</blockquote>`;
        return quote;

      case "list":
        const listTag = block.style === "numbered" ? "ol" : "ul";
        let list = `<${listTag}>`;
        block.items.forEach(item => {
          list += `<li>${item}</li>`;
        });
        list += `</${listTag}>`;
        return list;

      case "cta":
        return `<div class="cta cta-${block.variant || 'primary'}">
          <p>${block.text}</p>
          <a href="${block.buttonUrl}" class="cta-button">${block.buttonText}</a>
        </div>`;

      case "video":
        let video = `<div class="video-embed">`;
        // Convert YouTube/Vimeo URLs to embed format
        let embedUrl = block.url;
        if (block.url.includes("youtube.com/watch")) {
          const videoId = new URL(block.url).searchParams.get("v");
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (block.url.includes("youtu.be/")) {
          const videoId = block.url.split("youtu.be/")[1]?.split("?")[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
        video += `<iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
        if (block.caption) video += `<p class="video-caption">${block.caption}</p>`;
        video += `</div>`;
        return video;

      case "faq":
        let faq = `<div class="faq">`;
        block.items.forEach((item) => {
          faq += `<div class="faq-item">
            <h4 class="faq-question">${item.question}</h4>
            <div class="faq-answer">${item.answer}</div>
          </div>`;
        });
        faq += `</div>`;
        return faq;

      case "table":
        let table = `<table><thead><tr>`;
        block.headers.forEach(h => {
          table += `<th>${h}</th>`;
        });
        table += `</tr></thead><tbody>`;
        block.rows.forEach(row => {
          table += `<tr>`;
          row.forEach(cell => {
            table += `<td>${cell}</td>`;
          });
          table += `</tr>`;
        });
        table += `</tbody></table>`;
        return table;

      case "divider":
        return `<hr />`;

      case "html":
        return block.content;

      default:
        return "";
    }
  }).join("\n\n");
}

// Parse HTML back to blocks (basic implementation)
export function htmlToBlocks(html: string): ContentBlock[] {
  // For existing HTML content, wrap it in a single HTML block
  // This allows editing old posts while preserving their content
  if (!html || html.trim() === "") return [];

  return [{
    id: `block-${Date.now()}`,
    type: "html",
    content: html,
  }];
}
